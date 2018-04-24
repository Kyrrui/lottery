const assert = require('assert');
const ganache = require('ganache-cli');
const Web3 = require('web3');
const provider = ganache.provider();
const web3 = new Web3(provider);

const { interface, bytecode } = require('../compile');

let accounts;
let lottery;

beforeEach(async() => {
	// Get a list of all accounts
	accounts = await web3.eth.getAccounts();

	// Use an account to deploy the contract
	lottery = await new web3.eth.Contract(JSON.parse(interface))
	.deploy({ data: bytecode })
	.send({ from: accounts[0], gas: '1000000' });

	lottery.setProvider(provider);
});


describe('Lottery', () => {
	it('deploys a contract', () => {
		assert.ok(lottery.options.address);
	});

	it('allows entry', async() => {
		await lottery.methods.enter().send({
			from: accounts[0],
			value: web3.utils.toWei('0.01', 'ether')
		});
		const players = await lottery.methods.getPlayers().call({
			from: accounts[0]
		});
		assert.equal(accounts[0], players[0]);
		assert.equal(1, players.length);
	});

	it('allows multiple entries', async() => {
		await lottery.methods.enter().send({
			from: accounts[0],
			value: web3.utils.toWei('0.01', 'ether')
		});
		await lottery.methods.enter().send({
			from: accounts[1],
			value: web3.utils.toWei('0.01', 'ether')
		});
		await lottery.methods.enter().send({
			from: accounts[2],
			value: web3.utils.toWei('0.01', 'ether')
		});
		const players = await lottery.methods.getPlayers().call({
			from: accounts[0]
		});
		assert.equal(accounts[0], players[0]);
		assert.equal(accounts[1], players[1]);
		assert.equal(accounts[2], players[2]);
		assert.equal(3, players.length);
	});

	it('will not accept less than 0.01 ether', async() => {
		try {
			await lottery.methods.enter().send({
				from: accounts[0],
				value: web3.utils.toWei('0.001', 'ether')
			});
			assert(false);
		} catch (err) {
			assert(err);
		}
	});

	it('will not accept more than 0.01 ether', async() => {
		try {
			await lottery.methods.enter().send({
				from: accounts[0],
				value: web3.utils.toWei('1', 'ether')
			});
			assert(false);
		} catch (err) {
			assert(err);
		}
	});

	it('ensures that only the manager can call pickWinner method', async() => {
		try {
			await lottery.methods.pickWinner().send({
				from: accounts[1]
			});
			assert(false);
		} catch (err) {
			assert(err);
		}
	});

	it('sends money to winner and resets player array', async() => {
		// Check that lottery runs correctly
		await lottery.methods.enter().send({
			from: accounts[0],
			value: web3.utils.toWei('0.01', 'ether')
		});

		const initialBalance = await web3.eth.getBalance(accounts[0]);
		await lottery.methods.pickWinner().send({from: accounts[0]});
		const finalBalance = await web3.eth.getBalance(accounts[0]);
		const difference = finalBalance - initialBalance;

		assert(difference > web3.utils.toWei('0.008', 'ether')); //.008 to account for gas costs rather than 0.01 diff

		// Ensure player array has been emptied
		const players = await lottery.methods.getPlayers().call({
			from: accounts[0]
		});
		assert.equal(0, players.length);		
	});
});