const { MessageEmbed } = require("discord.js");
const YouTubeAPI = require("simple-youtube-api");
const { YOUTUBE_API_KEY, LOCALE, SOUNDCLOUD_CLIENT_ID } = require("../util/MusicaUtil.js");
const youtube = new YouTubeAPI(YOUTUBE_API_KEY);
const i18n = require("i18n");

const ScSearcher = require('sc-searcher');
const scSearch = new ScSearcher();

scSearch.init(SOUNDCLOUD_CLIENT_ID);

i18n.setLocale(LOCALE);

module.exports = {
  name: "search",
  description: i18n.__("search.description"),
  async execute(message, args) {
    if (!args.length)
      return message
        .reply(i18n.__mf("search.usageReply", { prefix: message.client.prefix, name: module.exports.name }))
        .catch(console.error);
    if (message.channel.activeCollector) return message.reply(i18n.__("search.errorAlreadyCollector"));
    if (!message.member.voice.channel)
      return message.reply(i18n.__("search.errorNotChannel")).catch(console.error);

    const search = args.join(" ");

    let resultsEmbed = new MessageEmbed()
      .setTitle(i18n.__("search.resultEmbedTtile"))
      .setDescription(i18n.__mf("search.resultEmbedDesc", { search: search }))
      .setColor("#F8AA2A");

    try {
      await scSearch.getTracks(search, 10)
      .then((res) => {
        res.forEach(elem => {
          let data = JSON.parse(JSON.stringify(elem));

          if (data.kind == "track") {
            resultsEmbed.addField(data.title, data.permalink_url)
            console.log(`[DEBUG]: Track detected! Info: ${data.title}, ${data.permalink_url}`)
          }
        });
      });

      let resultsMessage = await message.channel.send(resultsEmbed);

      function filter(msg) {
        const pattern = /^[0-9]{1,2}(\s*,\s*[0-9]{1,2})*$/;
        return pattern.test(msg.content);
      }

      message.channel.activeCollector = true;
      const response = await message.channel.awaitMessages(filter, { max: 1, time: 30000, errors: ["time"] });
      const reply = response.first().content;

      if (reply.includes(",")) {
        let songs = reply.split(",").map((str) => str.trim());

        for (let song of songs) {
          await message.client.commands
            .get("play")
            .execute(message, [resultsEmbed.fields[parseInt(song) - 1].value]);
        }
      } else {
        const choice = resultsEmbed.fields[parseInt(response.first()) - 1].value;
        console.log(choice);
        message.client.commands.get("play").execute(message, [choice]);
      }

      message.channel.activeCollector = false;
      resultsMessage.delete().catch(console.error);
      response.first().delete().catch(console.error);
    } catch (error) {
      console.error(error);
      message.channel.activeCollector = false;
      message.reply(error.message).catch(console.error);
    }
  }
};
