const { play } = require("../include/play");
const ytdl = require("ytdl-core");
const YouTubeAPI = require("simple-youtube-api");
const scdl = require("soundcloud-downloader").default
const https = require("https");
const { YOUTUBE_API_KEY, SOUNDCLOUD_CLIENT_ID, LOCALE, DEFAULT_VOLUME, PREFIX } = require("../util/MusicaUtil.js");
const youtube = new YouTubeAPI(YOUTUBE_API_KEY);
const i18n = require("i18n");

const ScSearcher = require('sc-searcher');
const scSearch = new ScSearcher();

scSearch.init(SOUNDCLOUD_CLIENT_ID);

const got = require('got');
const metascraper = require('metascraper')([
  require('metascraper-image')()
])

i18n.setLocale(LOCALE);

module.exports = {
  name: "play",
  cooldown: 3,
  aliases: ["p"],
  description: i18n.__("play.description"),
  async execute(message, args) {
    const { channel } = message.member.voice;

    const serverQueue = message.client.queue.get(message.guild.id);
    if (!channel) return message.reply(i18n.__("play.errorNotChannel")).catch(console.error);
    if (serverQueue && channel !== message.guild.me.voice.channel)
      return message
        .reply(i18n.__mf("play.errorNotInSameChannel", { user: message.client.user }))
        .catch(console.error);

    if (!args.length)
      return message
        .reply(i18n.__mf("play.usageReply", { prefix: message.client.prefix }))
        .catch(console.error);

    const permissions = channel.permissionsFor(message.client.user);
    if (!permissions.has("CONNECT")) return message.reply(i18n.__("play.missingPermissionConnect"));
    if (!permissions.has("SPEAK")) return message.reply(i18n.__("play.missingPermissionSpeak"));

    const search = args.join(" ");
    const videoPattern = /^(https?:\/\/)?(www\.)?(m\.)?(youtube\.com|youtu\.?be)\/.+$/gi;
    const playlistPattern = /^.*(list=)([^#\&\?]*).*/gi;
    const scRegex = /^https?:\/\/(soundcloud\.com)\/(.*)$/;
    const mobileScRegex = /^https?:\/\/(soundcloud\.app\.goo\.gl)\/(.*)$/;
    const url = args[0].replace("m.", "");
    const urlValid = videoPattern.test(args[0]);

    // Start the playlist if playlist url was provided
    if (!videoPattern.test(args[0]) && playlistPattern.test(args[0])) {
      return message.client.commands.get("playlist").execute(message, args);
    } else if (scdl.isValidUrl(url) && url.includes("/sets/")) {
      return message.client.commands.get("playlist").execute(message, args);
    }

    if (mobileScRegex.test(url)) {
      try {
        https.get(url, function (res) {
          if (res.statusCode == "302") {
            return message.client.commands.get("play").execute(message, [res.headers.location]);
          } else {
            return message.reply("No content could be found at that url.").catch(console.error);
          }
        });
      } catch (error) {
        console.error(error);
        return message.reply(error.message).catch(console.error);
      }
      return message.reply("Following url redirection...").catch(console.error);
    }

    const queueConstruct = {
      textChannel: message.channel,
      channel,
      connection: null,
      songs: [],
      loop: false,
      volume: DEFAULT_VOLUME || 100,
      playing: true
    };

    let songInfo = null;
    let song = null;

    if (urlValid) {
      try {
        message.channel.send(`**WARNING**: YouTube will be discontinued on 10/10/2021, or sooner.`)
        songInfo = await ytdl.getInfo(url);
        song = {
          title: songInfo.videoDetails.title,
          url: songInfo.videoDetails.video_url,
          duration: songInfo.videoDetails.lengthSeconds,
          provider: "youtube"
        };
      } catch (error) {
        console.error(error);
        return message.reply(error.message).catch(console.error);
      }
    } else if (scRegex.test(url)) {
      const ula = url;
      let imageURL;
      ;(async () => { //wonderful world of parsing
        const { body: html, url } = await got(ula)
        const metadata = await metascraper({ html, url })
        imageURL = JSON.parse(JSON.stringify(metadata))["image"];
      })()

      const trackInfo = await scdl.getInfo(url, SOUNDCLOUD_CLIENT_ID);
    
      song = {
        title: trackInfo.title,
        url: trackInfo.permalink_url,
        duration: Math.ceil(trackInfo.duration / 1000),
        provider: "soundcloud",
        imageSRC: imageURL
      };
    } else {
      message.channel.send(`This feature has been removed. Please use ${PREFIX}search instead!`)
    }

    if (serverQueue) {
      serverQueue.songs.push(song);
      return serverQueue.textChannel
        .send(i18n.__mf("play.queueAdded", { title: song.title, author: message.author }))
        .catch(console.error);
    }

    queueConstruct.songs.push(song);
    message.client.queue.set(message.guild.id, queueConstruct);

    try {
      queueConstruct.connection = await channel.join();
      await queueConstruct.connection.voice.setSelfDeaf(true);
      play(queueConstruct.songs[0], message);
    } catch (error) {
      console.error(error);
      message.client.queue.delete(message.guild.id);
      await channel.leave();
      return message.channel.send(i18n.__('play.cantJoinChannel', {error: error})).catch(console.error);
    }
  }
};
