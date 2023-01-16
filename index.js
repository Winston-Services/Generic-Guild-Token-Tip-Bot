const fs = require("fs");
const path = require("path");
const ethers = require("ethers");
const ganache = require("ganache");
const axios = require("axios");
const blockchainOptions = {
  chain: {
    name: "win",
    symbol: "win",
    /**
     * When set to false only one request will be processed at a time. [boolean] [default: true
     */
    asyncRequestProcessing: true,
    chainId: 1001010110
    // networkId:
  },

  database: { dbPath: path.resolve(path.join(__dirname, "./data/blockchain")) },

  logging: {
    /**
     * Set to true to log EVM opcodes. 
     */
    debug: true,
    /**
     * Set to true to disable logging. deprecated aliases: --quiet 
     */
    quiet: false,
    /**
     * Set to true to log detailed RPC requests. deprecated aliases: --verbose
     */
    verbose: true
  },

  miner: {
    // defaultGasPrice
    // blockGasLimit
    // callGasLimit
    coinbase: "0x7bb2b2201fd7d973addb9d2aa05eef558b07e17b"
  },
  wallet: {
    totalAccounts: 1,
    // accountKeysPath: path.resolve(path.join(__dirname, "./data/wallets.json")),

    mnemonic:
      "armed shoulder boring dream witness blue proud smile earth one soap mail", //process.env.mnemonic,
    defaultBalance: 1000000

    /**
    * The hierarchical deterministic path to use when generating accounts. [string] [default: m,44',60',0',0]
    */
    // hdPath: ""
  }
}; // add blockchain settings and storage.

/*
// we dont need it open to the public so no need to run a server.
const server = ganache.server(blockchainOptions);
const PORT = 8545; //move this to .env file

server.listen(PORT, async err => {
  if (err) throw err;

  console.log(`ganache listening on port ${PORT}...`);
});
*/
//load the configuration file
const currentFolderPath = path.resolve(path.join(__dirname));
require("dotenv").config({
  path: path.join(currentFolderPath, ".env")
});

const {
  Partials,
  IntentsBitField,
  Client,
  SlashCommandBuilder,
  Collection,
  Routes,
  EmbedBuilder
} = require("discord.js");

const options = {
  applicationId: process.env.DISCORD_API_USER,
  token: process.env.DISCORD_CLIENT_TOKEN
};

const _partials = [
  Partials["Channel"],
  Partials["Message"],
  Partials["Reaction"]
];

const _intents = new IntentsBitField([
  "Guilds",
  "GuildMembers",
  "GuildIntegrations",
  "GuildMessages",
  "GuildMessageReactions"
]);

//setup the bot connection
class GenericDiscordBod {
  _client;
  constructor(params) {
    //load the bots credentials
    this._client = new Client({ partials: _partials, intents: _intents });
    const ganacheProvider = ganache.provider(blockchainOptions);
    const web3Provider = new ethers.providers.Web3Provider(ganacheProvider);
    this._provider = web3Provider;
  }
  login = async () => {
    this.loadAccountData();
    await this._client.login(options.token);
    //load the event handlers.
    this.loadEventHandlers(currentFolderPath);
    //add the slash commands
    await this.addSlashCommands(currentFolderPath);
    //start the bot
  };

  _provider;
  _accounts;
  get accounts() {
    const getAccounts = async () => {
      // console.log(this._provider);
      return await this._provider.provider.request({
        method: "eth_accounts",
        params: []
      });
    };

    return getAccounts();
  }

  async getABI(token, tokenABIFilepath, network = "bsc") {
    const tokenPath = tokenABIFilepath
      ? tokenABIFilepath
      : path.resolve(path.join(__dirname, `./data/tokens/${token}.json`));
    // console.log(tokenPath);
    if (!fs.existsSync(tokenPath)) {
      const config = {
        scannerAPI:
          "https://api.bscscan.com/api?module=contract&action=getabi&address={smartContractAddress}&apikey={apiKey}",
        apiKey: process.env.BSCSCAN_API
      };

      if (network !== "bsc") {
        switch (network) {
          case "eth":
            config.scannerAPI = "";
            config.apiKey = ""; // API Key for the explorer
            break;
          case "matic":
            config.scannerAPI = "";
            config.apiKey = ""; // API Key for the explorer
            break;
          default:
            config.scannerAPI = "http://localhost:5469";
            config.apiKey = undefined; // API Key for the explorer
        }
      }

      const res = await axios
        .get(
          config.scannerAPI
            .replaceAll("{smartContractAddress}", token)
            .replaceAll("{apiKey}", config.apiKey),
          {
            method: "GET",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json"
            }
          }
        )
        .then(r => r.data)
        .catch(error => ({
          status: 0,
          message: error
        }));

      if (res.status === "1" && res.message === "OK") {
        // console.log(this.abi);
        fs.writeFileSync(tokenPath, res.result, {
          encoding: "utf8"
        });
        return JSON.parse(res.result);
      } else {
        throw Error("ABI Download ERROR :: " + res.message);
      }
    } else {
      return JSON.parse(fs.readFileSync(tokenPath));
    }
  }

  async getContract(address) {
    const abi = await this.getABI(address);
    return new ethers.Contract(address, abi, this._provider);
  }

  async contractListener(address, event, cb) {
    const contract = await getContract(address);
    return contract.on(event, cb);
  }

  getGasPrice() {
    return this._provider.getGasPrice();
  }

  async send(from, to, amount) {
    //from should be our signer,
    //to should be a valid address,
    //and three should be less than ones balance.

    const tx = await from.sendTransaction({
      to,
      value: amount
    });
    return tx.wait();
  }

  set accounts(value) {
    throw Error("Cannot Set Accounts");
  }
  userAccounts = new Map(); // we can use a map for now to store our users in.
  loadAccountData() {
    const filePath = path.resolve(path.join(__dirname, "./data/accounts"));
    if (fs.existsSync(filePath)) {
      const accountFiles = fs
        .readdirSync(filePath)
        .filter(file => file.endsWith(".json"));

      for (const file of accountFiles) {
        const accountfilePath = path.join(filePath, file);
        const userObject = require(accountfilePath);
        const did = file.split(".").shift();
        this.userAccounts.set(did, userObject);
      }
    }
  }
  async addAccount(did) {
    if (this.userAccounts.has(did)) {
      return this.userAccounts.get(did);
    } else {
      const newWallet = ethers.Wallet.createRandom();
      const formatedNewWallet = {
        address: await newWallet.getAddress(),
        privateKey: newWallet.privateKey,
        mnemonic: newWallet._mnemonic()
      };
      this.userAccounts.set(did, formatedNewWallet);
      this.saveAccount(did, formatedNewWallet);
      return this.addAccount(did);
    }
  }

  saveAccount(did, wallet) {
    const filePath = path.resolve(path.join(__dirname, "./data/accounts"));
    try {
      // console.log(wallet);
      fs.writeFileSync(
        path.join(filePath, `${did}.json`),
        JSON.stringify(JSON.parse(JSON.stringify(wallet)), false, 2)
      );
    } catch (error) {
      console.error(error);
    }
  }

  //add the slash commands if they have not been added.
  loadSlashCommands = currentFolderPath => {
    console.log("Checking for Slash Commands.");
    const startPath = path.resolve(path.join(currentFolderPath, "commands"));
    if (!fs.existsSync(startPath)) {
      throw Error("Error: Command folder not found.");
    }
    console.log("Slash Commands folder found.");

    let botCommands = [];

    //check the global commands folder.
    if (fs.existsSync(path.join(startPath, "app"))) {
      console.log("Loading Global Slash Commands.");

      const commandsPath = path.join(startPath, "app");
      const commandFiles = fs
        .readdirSync(commandsPath)
        .filter(file => file.endsWith(".command.js"));

      for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        botCommands.push(command);
      }
    }

    if (fs.existsSync(path.join(startPath, "guild"))) {
      console.log("Loading Guild Slash Commands.");
      const commandsPath = path.join(startPath, "guild");
      const commandFiles = fs
        .readdirSync(commandsPath)
        .filter(file => file.endsWith(".command.js"));

      for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        botCommands.push(command);
      }
    }

    return botCommands;
  };

  addSlashCommands = async currentFolderPath => {
    // C:\Users\micha\Dropbox\Winston\apps\bots\Dev
    const startPath = path.resolve(path.join(currentFolderPath, "commands"));
    if (!fs.existsSync(startPath)) {
      throw Error("Error: Command folder not found.");
    }

    this.botCommands = this.loadSlashCommands(currentFolderPath);

    const globalCommands = new Collection();
    const guildCommands = new Collection();
    //loop through bot commands and build slash handlers.
    for (const interaction of this.botCommands) {
      const structuredCommand = new SlashCommandBuilder();
      structuredCommand.name = interaction.name;
      structuredCommand.description = interaction.description;
      structuredCommand.setDMPermission(interaction.dm_permission);
      structuredCommand.setDefaultMemberPermissions(
        interaction.default_permission
      );

      if (interaction.commands) {
        try {
          this.commandBuilder(structuredCommand, interaction.commands);
        } catch (error) {
          console.error(error);
          throw Error("Command Initialization Error.");
        }
      }
      if (interaction.options) {
        try {
          this.optionBuilder(structuredCommand, interaction.options);
        } catch (error) {
          console.error(error);
          throw Error("Command Option Initialization Error.");
        }
      }
      if (interaction.guild_id) {
        guildCommands.set(interaction.name, structuredCommand);
      } else {
        globalCommands.set(interaction.name, structuredCommand);
      }
    }
    // ToDo :: Loop Through Approved Guilds and set commands.
    // console.log(guildCommands.values());
    if (guildCommands.size) {
      //add the guild commands to discord.
      await this.updateSlashCommands(
        guildCommands.mapValues(c => c.toJSON()),
        interaction.guild_id //"897546129108008960"
      );
    }
    if (globalCommands.size) {
      //add the bot commands to discord.
      console.log("Global Commands Found Updating now.");
      await this.updateSlashCommands(globalCommands.mapValues(c => c.toJSON()));
    }
    // load all slash commands and add them to discord.
  };

  updateSlashCommands = async (commands, guildId, clientId) => {
    const putGlobalCommands = async (clientId, commands) => {
      console.log("Adding Global Commands to Discord.");
      return await this._client.rest.put(Routes.applicationCommands(clientId), {
        body: commands
      });
    };
    const putGuildCommands = async (clientId, guildId, commands) => {
      console.log("Adding Guild Commands to Discord.");
      return await this._client.rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commands }
      );
    };
    if (guildId) {
      return await putGuildCommands(
        clientId ? clientId : this._client.application.id,
        guildId,
        commands
      );
    } else {
      return await putGlobalCommands(
        clientId ? clientId : this._client.application.id,
        commands
      );
    }
  };

  commandBuilder = (builder = new SlashCommandBuilder(), commandArray) => {
    let current = commandArray.shift();
    builder.addSubcommand(subcommand => {
      subcommand.setName(current.name);
      subcommand.setDescription(current.description);
      if (current.options !== undefined && current.options.length) {
        return this.optionBuilder(subcommand, current.options);
      }
      return subcommand;
    });
    if (commandArray.length > 0)
      return this.commandBuilder(builder, commandArray);
  };

  optionBuilder = (command, options = []) => {
    const current = options.shift();
    if (current.type === "StringOption")
      command.addStringOption(option => {
        option.setName(current.name);
        option.setDescription(current.description);
        if (current.required) {
          option.setRequired(current.required);
        }
        return option;
      });
    if (current.type === "NumberOption")
      command.addNumberOption(option => {
        option.setName(current.name);
        option.setDescription(current.description);
        if (current.required) {
          option.setRequired(current.required);
        }
        return option;
      });
    if (current.type === "UserOption")
      command.addUserOption(option => {
        option.setName(current.name);
        option.setDescription(current.description);
        if (current.required) {
          option.setRequired(current.required);
        }
        return option;
      });
    if (current.type === "BooleanOption")
      command.addBooleanOption(option => {
        option.setName(current.name);
        option.setDescription(current.description);
        if (current.required) {
          option.setRequired(current.required);
        }
        return option;
      });
    if (current.type === "RoleOption")
      command.addRoleOption(option => {
        option.setName(current.name);
        option.setDescription(current.description);
        if (current.required) {
          option.setRequired(current.required);
        }
        return option;
      });
    if (current.type === "ChannelOption")
      command.addChannelOption(option => {
        option.setName(current.name);
        option.setDescription(current.description);
        if (current.required) {
          option.setRequired(current.required);
        }
        return option;
      });
    if (options.length > 0) return this.optionBuilder(command, options);
    return command;
  };

  loadEventHandlers = currentPath => {
    const eventsPath = path.join(currentPath, "events");
    const eventFiles = fs
      .readdirSync(eventsPath)
      .filter(file => file.endsWith(".event.js"));
    for (const file of eventFiles) {
      const filePath = path.join(eventsPath, file);
      const event = require(filePath);
      if (event.once) {
        this._client.once(event.name, (...args) => {
          event.execute.call(this, ...args);
          delete require.cache[require.resolve(filePath)];
        });
      } else {
        this._client.on(event.name, (...args) => {
          event.execute.call(this, ...args);
          delete require.cache[require.resolve(filePath)];
        });
      }
    }
  };
  actionModules = new Collection();
  loadActions = (currentPath, args = {}, file = "index.action.js") => {
    this.continue = true;
    const actionPath = path.join(currentPath, file);
    if (this.actionModules.has(actionPath)) {
      const eventMiddlewareAction = this.actionModules.get(actionPath);
      // console.info("Action Executed : ", eventMiddlewareAction);
      try {
        eventMiddlewareAction.execute.call(this, ...args, () => {
          this.continue = false;
        });
      } catch (error) {
        this._continue = false;
        console.log(error);
        return;
      }
    } else if (fs.existsSync(actionPath)) {
      const eventMiddlewareAction = require(actionPath);
      this.actionModules.set(actionPath, eventMiddlewareAction);
      // console.info("Action Loaded : ", eventMiddlewareAction);
      try {
        eventMiddlewareAction.execute.call(this, ...args, () => {
          this.continue = false;
        });
      } catch (error) {
        this._continue = false;
        console.log(error);
        delete require.cache[require.resolve(actionPath)];
        return;
      }
    } else {
      console.warn("File not found.", currentPath, file);
    }
  };
  buildEmbed({
    author,
    color,
    title,
    description,
    fields,
    image,
    thumbnail,
    url,
    footer
  }) {
    const embed = new EmbedBuilder();
    if (author) embed.setAuthor(author);
    if (color) embed.setColor(color);
    if (title) embed.setTitle(title);
    if (description) embed.setDescription(description);
    if (fields) embed.setFields(fields);
    if (image) embed.setImage(image);
    if (thumbnail) embed.setThumbnail(thumbnail);
    if (url) embed.setURL(url);
    if (footer) embed.setFooter(footer);
    return embed;
  }
  setUsername(username) {
    this._client.user.setUsername(username);
  }
  authorize = (clientId = "594415583638847488", permissionBits = "8") => {
    //console.log(clientId, permissionBits);
    return `https://discord.com/api/oauth2/authorize?client_id=${clientId}&scope=bot&permissions=${permissionBits}`;
  };
}
async function main() {
  const GenericBot = new GenericDiscordBod();
  await GenericBot.login();
  GenericBot.setUsername("! GenericBot");

  console.log(
    "Invite Your Bot :: ",
    GenericBot.authorize(
      process.env.DISCORD_API_USER,
      process.env.DISCORD_CLIENT_PERMISSIONS
    )
  );
  console.log("Bot Running.");
}
main();
