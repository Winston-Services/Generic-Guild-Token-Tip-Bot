const ethers = require("ethers");

module.exports = {
  type: undefined, // 1 | 2 | 3
  name: "tip",
  description: "Tip others crypto.",
  options: [
    {
      type: "NumberOption",
      name: "amount",
      description: "Enter an amount to tip.",
      required: true
    },
    {
      type: "UserOption",
      name: "user",
      description: "Select A User",
      required: true
    }
    /*
    {
      type: "StringOption",
      name: "mentions",
      description: "Mention users, roles, and/or channels",
      required: false
    },
    {
      type: "RoleOption",
      name: "role",
      description: "Select a Role",
      required: false
    }
    */
  ],
  commands: undefined,
  dm_permission: false,
  default_permission: null,
  async execute() {
    const [interaction, ...rest] = arguments;
    // console.log(interaction, rest);
    if (this.userAccounts.has(interaction.user.id)) {
      const userAccount = this.userAccounts.get(interaction.user.id);
      const userBalance = await this._provider.getBalance(userAccount.address);
      // console.log(userBalance);
      const amount = interaction.options.getNumber("amount");
      if (userBalance > amount) {
        const to = interaction.options.getMember("user");
        /**
         * send the money already man!!!
         */
        // console.log(to);
        let sender = ethers.Wallet.fromMnemonic(userAccount.mnemonic.phrase);
        const signer = sender.connect(this._provider);
        // console.log("Sender", signer);
        let receiver = this.userAccounts.get(to.user.id);
        try {
          const trx = await this.send(signer, receiver.address, ethers.utils.parseEther(amount.toString()) );
          console.log(trx);
          return interaction.reply(`You just tipped ${amount} ${to}!`);
        } catch (error) {
          console.log(error);
          return interaction.reply("The transaction failed."); // , check your history for details.
        }
      } else {
        return interaction.reply("You dont have the balance to tip anyone.");
      }
    } else {
      await this.addAccount(interaction.user.id);
      return interaction.reply("You dont have the balance to tip anyone.");
    }
  }
};
