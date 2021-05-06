/* Simplified stock exchange made with uWebSockets.js pub/sub */
const ws = require('ws')
const { StringDecoder } = require('string_decoder');
const decoder = new StringDecoder('utf8');
const { doStats } = require('../statify')

/* We measure transactions per second server side */
let transactionsPerSecond = 0;

/* Share valuations */
let shares = {
	'NFLX': 280.48,
	'TSLA': 244.74,
	'AMZN': 1720.26,
	'GOOG': 1208.67,
	'NVDA': 183.03
};

const wss = new ws.Server({ port: 9001 })
let id = 0
wss.on('connection', function(ws, req) {
	const rooms = {}
	ws.id = id++
	ws.subscribe = function(room) {
		if (!rooms[room]) rooms[room] = {}
		rooms[room][this.id] = this
	}
	ws.publish = function(room, data) {
		if (!rooms[room]) return
		for (const c of Object.values(rooms[room])) {
			c.send(data)
		}
	}
	ws.on('message', function(message) {
		/* Parse JSON and perform the action */
		let json = JSON.parse(decoder.write(Buffer.from(message)));
		switch (json.action) {
			case 'sub': {
				/* Subscribe to the share's value stream */
				ws.subscribe('shares/' + json.share + '/value');
				break;
			}
			case 'buy': {
				transactionsPerSecond++;

				/* For simplicity, shares increase 0.1% with every buy */
				shares[json.share] *= 1.001;

				/* Value of share has changed, update subscribers */
				ws.publish('shares/' + json.share + '/value', JSON.stringify({[json.share]: shares[json.share]}));
				break;
			}
			case 'sell': {
				transactionsPerSecond++;

				/* For simplicity, shares decrease 0.1% with every sale */
				shares[json.share] *= 0.999

				ws.publish('shares/' + json.share + '/value', JSON.stringify({[json.share]: shares[json.share]}));
				break;
			}
		}
	})
	ws.on('close', function() {
		for (const r of Object.values(room)) {
			delete r[this.id]
		}
	})
})

/* Print transactions per second */
let last = Date.now();
setInterval(() => {
	doStats(transactionsPerSecond)
	transactionsPerSecond = 0;
	last = Date.now();
}, 1000)
