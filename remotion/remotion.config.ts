import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setCodec("h264");
// 15W CPU — two render workers keeps the laptop usable during a render.
Config.setConcurrency(2);
// Reads the site's already-optimised crops straight out of public/.
Config.setPublicDir("../public");
