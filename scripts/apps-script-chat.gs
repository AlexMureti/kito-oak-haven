/**
 * Kito Oak Haven — the chat behind the website.
 *
 * Third file in the same Apps Script project as apps-script.gs and
 * apps-script-calendar.gs. They share globals.
 *
 * Why it lives here and not on the site: the site is a static export, so it
 * has no server of its own, and an API key placed in the browser bundle is a
 * key anyone can read and spend. This runs on Google's side, reads the key
 * from Script Properties, and the browser only ever sees the answer.
 *
 * Setup, once:
 *   1. Project Settings > Script Properties, add
 *        NVIDIA_API_KEY = the key
 *      Optionally NVIDIA_MODEL to pin a model.
 *   2. Redeploy the web app (Deploy > Manage deployments > edit > Deploy).
 *      The /exec URL does not change, so the site needs no edit.
 *
 * The guard that matters: this endpoint is public and every call costs money.
 * A daily cap lives in Script Properties, so the worst a scraper can do is
 * exhaust one day rather than a balance.
 */

var CHAT_MODELS = ['moonshotai/kimi-k3', 'minimaxai/minimax-m3'];
var CHAT_ENDPOINT = 'https://integrate.api.nvidia.com/v1/chat/completions';

/** Replies per day across all visitors. Raise it when it starts biting. */
var CHAT_DAILY_CAP = 200;

/** Anything longer is not a guest asking about an apartment. */
var CHAT_MAX_CHARS = 600;

/** Turns of history the browser may send back. Keeps the bill and the prompt small. */
var CHAT_MAX_TURNS = 8;

/**
 * Everything the model is allowed to know.
 *
 * Kept here rather than fetched, so it cannot drift into inventing amenities.
 * If a fact is not in this block the model is told to say it will check —
 * which is the correct answer for a real apartment somebody will actually
 * arrive at.
 */
function propertyFacts_() {
  return [
    'Kito Oak Haven is a private one-bedroom apartment on the seventh floor of',
    'Oak Classic Residence, George Padmore Road, Kilimani, Nairobi, Kenya.',
    '',
    'Rate: KSh 7,000 per night, booked direct, nothing added at checkout.',
    'Payment is by M-Pesa. A deposit holds the dates and the balance is settled',
    'on arrival once the guest is inside and satisfied.',
    '',
    'Sleeps two to three. King bed, hotel-grade cotton, blackout drapes.',
    'Full kitchen with a gas cooktop, air fryer, blender, coffee maker and a',
    'water purifier dispenser. LG washing machine in the unit. Smart TV and',
    'soundbar. Private balcony with city views. Rainfall shower, instant hot water.',
    '',
    'Building: heated indoor pool and a full gym on the second floor, open 6am',
    'to 9pm, no extra fee. Automatic backup generator picks up the load in 10 to',
    '15 seconds, so wifi, lights, water pump and lifts stay on through an outage.',
    'Dedicated fiber line and a real desk, suitable for video calls.',
    '',
    'Check-in is contactless by smart keypad lock, from 2:00 PM. Check-out by',
    '11:00 AM. Because there is no key to hand over, early arrival and late',
    'departure are usually possible if asked in advance. There is a caretaker on',
    'site and the building is gated.',
    '',
    'Cancellation: free up to 48 hours before arrival with the deposit refunded',
    'in full. Inside 48 hours the deposit is held against the dates, but if the',
    'nights are re-let they are refunded.',
    '',
    'Airport transfer: tell us your flight number and a driver is arranged at the',
    "guest's own cost, quoted up front. Roughly 30 to 45 minutes from JKIA.",
    'Uber and Bolt work — set the destination to Oak Classic Residence.',
    '',
    'Nearby: Yaya Centre and Adlife Plaza 8 minutes on foot. Carrefour and',
    'Chandarana 10 minutes on foot. Nairobi Hospital 8 minutes by car. The CBD',
    '12 minutes by car.',
  ].join('\n');
}

function chatSystemPrompt_(today) {
  return [
    'You answer questions from guests on the Kito Oak Haven website. You are',
    'warm, brief and specific. Two or three sentences at most, because the guest',
    'is on a phone.',
    '',
    'TODAY is ' + today + '. The property is in Nairobi (UTC+3).',
    '',
    '=== THE ONLY FACTS YOU HAVE ===',
    propertyFacts_(),
    '=== END OF FACTS ===',
    '',
    'Rules you must not break:',
    '',
    '1. NEVER say a date is available, free, or open. You cannot see the',
    '   calendar. If asked about specific dates, say you will confirm and',
    '   suggest sending them on WhatsApp.',
    '2. NEVER invent a fact that is not above. If you do not know, say you will',
    '   check and point the guest to WhatsApp. Guessing about a real apartment',
    '   that someone will physically arrive at is the worst thing you can do.',
    '3. Never quote a price other than KSh 7,000 per night.',
    '4. Do not claim to be a person, and do not claim to be an employee. If',
    '   asked, say you are an assistant on the website and a real person answers',
    '   on WhatsApp.',
    '5. Money is KSh. Distances in minutes. Kenyan context, not American.',
    '',
    'If the guest mentions dates, still answer their question — the website',
    'reads the dates separately and will show them on the calendar.',
  ].join('\n');
}

/**
 * Pulls dates out of the message in the same pass, so the site can move its
 * calendar to what the guest just said. Returned separately from the reply
 * because the reply must never assert availability and this must never guess.
 */
function chatDateSchema_() {
  return [
    'Also extract any stay the guest described, as JSON on the FINAL line only,',
    'with no other text on that line:',
    '',
    'DATES: {"checkIn":"YYYY-MM-DD or null","checkOut":"YYYY-MM-DD or null","guests":number or null}',
    '',
    'checkOut is the day they LEAVE. "14th to the 18th" means checkIn 14,',
    'checkOut 18. "3 nights from the 14th" means checkIn 14, checkOut 17.',
    'Resolve relative dates against TODAY and never return a past date. If a',
    'month is not stated, use the next occurrence at or after TODAY. If you',
    'cannot tell, use null. Do not guess.',
  ].join('\n');
}

function handleChat_(data) {
  var props = PropertiesService.getScriptProperties();
  var key = props.getProperty('NVIDIA_API_KEY');
  if (!key) return { ok: false, reply: 'The assistant is not configured yet.' };

  if (!underDailyCap_(props)) {
    return {
      ok: false,
      reply: 'The assistant is resting for today. Message us on WhatsApp and a real person will answer.',
    };
  }

  var turns = Array.isArray(data.history) ? data.history.slice(-CHAT_MAX_TURNS) : [];
  var message = String(data.message || '').slice(0, CHAT_MAX_CHARS).trim();
  if (!message) return { ok: false, reply: '' };

  var today = Utilities.formatDate(new Date(), 'Africa/Nairobi', 'yyyy-MM-dd');

  var messages = [{ role: 'system', content: chatSystemPrompt_(today) + '\n\n' + chatDateSchema_() }];
  for (var i = 0; i < turns.length; i++) {
    var role = turns[i].role === 'assistant' ? 'assistant' : 'user';
    messages.push({ role: role, content: String(turns[i].content || '').slice(0, CHAT_MAX_CHARS) });
  }
  messages.push({ role: 'user', content: message });

  var raw = callModel_(key, messages, props.getProperty('NVIDIA_MODEL'));
  if (raw === null) {
    return { ok: false, reply: 'I could not reach the assistant just now — WhatsApp is the fastest route.' };
  }

  return parseChatReply_(raw);
}

/** Walks the candidates, because a listed model is not a deployed one. */
function callModel_(key, messages, pinned) {
  var models = pinned ? [pinned] : CHAT_MODELS;

  for (var i = 0; i < models.length; i++) {
    var model = models[i];
    var reasoning = /kimi|gpt-oss/i.test(model);

    var payload = {
      model: model,
      messages: messages,
      // Thinking is always on for kimi-k3 and those tokens count against the
      // budget, so a small max_tokens returns nothing at all.
      max_tokens: reasoning ? 4096 : 500,
      temperature: reasoning ? 1 : 0.3,
    };
    if (reasoning) {
      payload.seed = 0;
      payload.reasoning_effort = 'low';
    }

    try {
      var res = UrlFetchApp.fetch(CHAT_ENDPOINT, {
        method: 'post',
        contentType: 'application/json',
        headers: { Authorization: 'Bearer ' + key },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true,
      });

      if (res.getResponseCode() !== 200) continue;

      var body = JSON.parse(res.getContentText());
      var msg = (body.choices && body.choices[0] && body.choices[0].message) || {};
      var text = msg.content || msg.reasoning_content || '';
      if (text && text.trim()) return text;
    } catch (err) {
      // Try the next model rather than failing the guest.
    }
  }
  return null;
}

/** Splits the visible reply from the DATES line the model appends. */
function parseChatReply_(raw) {
  var dates = null;
  var lines = String(raw).split(/\r?\n/);
  var kept = [];

  for (var i = 0; i < lines.length; i++) {
    var m = lines[i].match(/^\s*DATES:\s*(\{.*\})\s*$/);
    if (m) {
      try {
        var d = JSON.parse(m[1]);
        var ok = /^\d{4}-\d{2}-\d{2}$/;
        dates = {
          checkIn: ok.test(d.checkIn || '') ? d.checkIn : null,
          checkOut: ok.test(d.checkOut || '') ? d.checkOut : null,
          guests: typeof d.guests === 'number' ? d.guests : null,
        };
        if (dates.checkOut && dates.checkIn && dates.checkOut <= dates.checkIn) {
          dates.checkOut = null;
        }
      } catch (err) {
        dates = null;
      }
    } else {
      kept.push(lines[i]);
    }
  }

  // Strip any stray fences the model wrapped its thinking in.
  var reply = kept.join('\n').replace(/```[a-z]*|```/g, '').trim();

  return { ok: true, reply: reply, dates: dates };
}

/**
 * One counter per day. The endpoint is public and each reply costs, so the
 * blast radius of a scraper is one day's cap rather than the whole balance.
 */
function underDailyCap_(props) {
  var today = Utilities.formatDate(new Date(), 'Africa/Nairobi', 'yyyy-MM-dd');
  var stamp = props.getProperty('CHAT_DAY');
  var used = Number(props.getProperty('CHAT_USED') || 0);

  if (stamp !== today) {
    props.setProperty('CHAT_DAY', today);
    props.setProperty('CHAT_USED', '1');
    return true;
  }
  if (used >= CHAT_DAILY_CAP) return false;

  props.setProperty('CHAT_USED', String(used + 1));
  return true;
}

/** Run this in the editor to check the key and model without a browser. */
function testChat() {
  var out = handleChat_({ message: 'is there parking, and can I arrive late on the 14th of next month?' });
  Logger.log(JSON.stringify(out, null, 2));
}
