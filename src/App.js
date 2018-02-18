import React, { Component } from "react";
import promisify from "tiny-promisify";
import Dharma from "@dharmaprotocol/dharma.js";
import BigNumber from "bignumber.js";

import {
  Button,
  FormGroup,
  ControlLabel,
  FormControl,
  HelpBlock,
  Well
} from "react-bootstrap";

import DebtKernel from "../build/contracts/DebtKernel.json";
import RepaymentRouter from "../build/contracts/RepaymentRouter.json";
import TokenTransferProxy from "../build/contracts/TokenTransferProxy.json";
import TokenRegistry from "../build/contracts/TokenRegistry.json";
import DebtToken from "../build/contracts/DebtToken.json";
import TermsContractRegistry from "../build/contracts/TermsContractRegistry.json";
import ShortTermsContract from "../build/contracts/ShortTermsContract.json";
import Collateralized from "../build/contracts/Collateralized.json";
import DAI from "../build/contracts/DAI.json";

import getWeb3 from "./utils/getWeb3";

import "./css/open-sans.css";
import "./css/pure-min.css";
import "./App.css";
import "../node_modules/bootstrap/dist/css/bootstrap.min.css";

class App extends Component {
  constructor(props) {
    super(props);

    this.handlePrincipalAmountChange = this.handlePrincipalAmountChange.bind(
      this
    );
    this.handlePrincipalTokenChange = this.handlePrincipalTokenChange.bind(
      this
    );
    this.handleInterestRateChange = this.handleInterestRateChange.bind(this);
    //this.handleInstallmentsTypeChange = this.handleInstallmentsTypeChange.bind(this);
    this.handleTermLengthChange = this.handleTermLengthChange.bind(this);

    this.onGenerateDebtOrder = this.onGenerateDebtOrder.bind(this);
    this.onSignDebtOrder = this.onSignDebtOrder.bind(this);
    this.onApproveDAI = this.onApproveDAI.bind(this);
    this.onPostCollateral = this.onPostCollateral.bind(this);
    this.onFillOrder = this.onFillOrder.bind(this);

    this.state = {
      principalAmount: 100,
      interestRate: 10,
      termLength: 30,
      storageValue: 0,
      web3: null,
      dharma: null,
      principalTokenSymbol: "REP",
      amortizationUnit: "months"
    };
  }

  componentWillMount() {
    // Get network provider and web3 instance.
    // See utils/getWeb3 for more info.

    getWeb3
      .then(results => {
        this.setState({
          web3: results.web3
        });

        // Instantiate contract once web3 provided.
        this.instantiateDharma();
      })
      .catch(e => {
        console.log("Error instantiating Dharma contracts:" + e);
      });
  }

  handlePrincipalAmountChange(e) {
    this.setState({
      principalAmount: e.target.value
    });
  }

  handlePrincipalTokenChange(e) {
    this.setState({
      principalTokenSymbol: e.target.value
    });
  }

  handleInterestRateChange(e) {
    this.setState({
      interestRate: e.target.value
    });
  }

  handleInstallmentsTypeChange(e) {
    this.setState({
      amortizationUnit: e.target.value
    });
  }

  handleTermLengthChange(e) {
    this.setState({
      termLength: e.target.value
    });
  }

  async onGenerateDebtOrder(e) {
    const {
      principalAmount,
      principalTokenSymbol,
      interestRate,
      amortizationUnit,
      termLength
    } = this.state;

    const dharma = this.state.dharma;

    const tokenRegistry = await dharma.contracts.loadTokenRegistry();
    const principalToken = await tokenRegistry.getTokenAddress.callAsync(
      principalTokenSymbol
    );

    const simpleInterestLoan = {
      principalToken,
      principalAmount: new BigNumber(principalAmount),
      interestRate: new BigNumber(interestRate),
      amortizationUnit,
      termLength: new BigNumber(termLength)
    };

    const debtOrder = await dharma.adapters.simpleInterestLoan.toDebtOrder(
      simpleInterestLoan
    );
    this.setState({ debtOrder: JSON.stringify(debtOrder) });
  }

  async onSignDebtOrder(e) {
    if (!this.state.debtOrder) {
      throw new Error("No debt order has been generated yet!");
    }

    const debtOrder = JSON.parse(this.state.debtOrder);

    debtOrder.principalAmount = new BigNumber(debtOrder.principalAmount);
    debtOrder.debtor = this.state.accounts[0];

    // Sign as debtor
    const debtorSignature = await this.state.dharma.sign.asDebtor(debtOrder);
    const signedDebtOrder = Object.assign({ debtorSignature }, debtOrder);
    const hash = await this.state.dharma.order.getIssuanceHash(signedDebtOrder);
    this.setState({ debtOrder: JSON.stringify(signedDebtOrder), hash: hash });
  }

  async onApproveDAI(e) {
    const daiAddr = DAI.networks[this.state.networkId].address;
    const dai = new this.state.web3.eth.Contract(DAI.abi, daiAddr);
    const totalSupply = await dai.methods.totalSupply().call();
    const collateralizedAddr =
      Collateralized.networks[this.state.networkId].address;
    await dai.methods
      .approve(collateralizedAddr, totalSupply)
      .send({ from: this.state.accounts[0] });
  }

  async onPostCollateral(e) {
    const daiAddr = DAI.networks[this.state.networkId].address;
    const collateralized = new this.state.web3.eth.Contract(
      Collateralized.abi,
      Collateralized.networks[this.state.networkId].address
    );
    await collateralized.methods
      .collateralize(this.state.hash, daiAddr, 10, 1000)
      .send({ from: this.state.accounts[0] });
  }

  async onFillOrder(e) {
    await this.state.dharma.order.fillAsync(this.state.debtOrder, {
      from: this.state.accounts[1]
    });
  }

  async instantiateDharma() {
    const networkId = await promisify(this.state.web3.version.getNetwork)();
    const accounts = await promisify(this.state.web3.eth.getAccounts)();

    if (
      !(
        networkId in DebtKernel.networks &&
        networkId in RepaymentRouter.networks &&
        networkId in TokenTransferProxy.networks &&
        networkId in TokenRegistry.networks &&
        networkId in DebtToken.networks &&
        networkId in TermsContractRegistry.networks
      )
    ) {
      throw new Error(
        "Cannot find Dharma smart contracts on current Ethereum network."
      );
    }

    const dharmaConfig = {
      kernelAddress: DebtKernel.networks[networkId].address,
      repaymentRouterAddress: RepaymentRouter.networks[networkId].address,
      tokenTransferProxyAddress: TokenTransferProxy.networks[networkId].address,
      tokenRegistryAddress: TokenRegistry.networks[networkId].address,
      debtTokenAddress: DebtToken.networks[networkId].address,
      termsContractRegistry: TermsContractRegistry.networks[networkId].address
    };

    const dharma = new Dharma(this.state.web3.currentProvider, dharmaConfig);

    this.setState({ dharma, accounts, networkId });
  }

  render() {
    return (
      <div className="App">
        <main className="container">
          <div className="pure-g">
            <div className="pure-u-1-1">
              <h1>ShortSell on Dharma Protocol</h1>
              <h5>
                <b>
                  Stake DAI to borrow ERC-20s, and bet on their price dropping.
                  By Max Wolff, Zach Zeleznick, and Rich McAteer
                </b>
              </h5>
              <form>
                <FormGroup controlId="formBasicText">
                  <ControlLabel>Principal Amount</ControlLabel>
                  <FormControl
                    type="number"
                    defaultValue={this.state.principalAmount}
                    onChange={this.handlePrincipalAmountChange}
                  />
                  <HelpBlock>
                    Enter the amount of tokens you would like to borrow.
                  </HelpBlock>
                </FormGroup>
                <FormGroup controlId="formControlsSelect">
                  <ControlLabel>Principal Token</ControlLabel>
                  <FormControl
                    componentClass="select"
                    placeholder="select"
                    onChange={this.shandlePrincipalTokenChange}
                  >
                    <option value="REP">Augur (REP)</option>
                    <option value="MKR">Maker DAO (MKR)</option>
                    <option value="ZRX">0x Token (ZRX)</option>
                  </FormControl>
                </FormGroup>
                <FormGroup controlId="formControlsSelect">
                  <ControlLabel>Interest Rate (%)</ControlLabel>
                  <FormControl
                    type="number"
                    step="0.001"
                    defaultValue={this.state.interestRate}
                    onChange={this.handleInterestRateChange}
                  />
                </FormGroup>
                <FormGroup controlId="formBasicText">
                  <ControlLabel>Term Length (days)</ControlLabel>
                  <FormControl
                    type="number"
                    defaultValue={this.state.termLength}
                    onChange={this.handleTermLengthChange}
                  />
                </FormGroup>
                <Button bsStyle="primary" onClick={this.onGenerateDebtOrder}>
                  Generate Debt Order
                </Button>
                <br />
                <br />
                <Button bsStyle="primary" onClick={this.onSignDebtOrder}>
                  Sign Debt Order
                </Button>
                <br />
                <br />
                <Button bsStyle="primary" onClick={this.onApproveDAI}>
                  Approve DAI
                </Button>
                <br />
                <br />
                <Button bsStyle="primary" onClick={this.onPostCollateral}>
                  Post Collateral
                </Button>
                <br />
                <br />
                <Button bsStyle="primary" onClick={this.onFillOrder}>
                  Fill Order
                </Button>
                <code>{this.state.debtOrder}</code>
              </form>
            </div>
          </div>
        </main>
      </div>
    );
  }
}

export default App;