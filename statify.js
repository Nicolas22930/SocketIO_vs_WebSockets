const fs = require('fs')
const conf = require(__dirname + '/conf.js')
const path = require('path')

let last = Date.now()
const stats = []

const columnsCSV = {
    transactions: 'transactions',
    elapsed: 'elapsed',
    memory: 'memory usage',
    perSecond: 'transactions per second',
    date: 'date',
    average: 'average',
    averageMemory: 'averageMemory' 
}

function writeToCSV(tab, file) {
    if (!tab.length) {
        return
    }
    const fp = fs.openSync(file, 'w')
    
    fs.writeSync(fp, Object.values(columnsCSV).map(o => `"${o}"`).join(';') + '\n')

    for (const line of tab) {
        const vals = []
        for (const k of Object.keys(columnsCSV)) {
            vals.push(line[k])
        }
        fs.writeSync(fp, vals.map(v => `"${v}"`).join(';') + '\n')
    }

    fs.closeSync(fp)
}

module.exports = {
    doStats: (transactions) => {
        if (transactions === 0) return
        const used = process.memoryUsage().heapUsed / 1024 / 1024
        const n = (Date.now() - last) * 0.001
        const stat = { transactions: transactions, elapsed: n, perSecond: transactions/n, date: (new Date()).toLocaleString(), memory: used }
        const allStats = [ ...stats, stat ]
        const average = allStats.reduce((v, stat) => (v || 0) + stat.perSecond, 0) / allStats.length
        const averageMemory = allStats.reduce((v, stat) => (v || 0) + stat.memory, 0) / allStats.length
        stat.average = average
        stat.averageMemory = averageMemory

        stats.push(stat)
        console.log(new Date(), 
            `Memory used ${Number(used).toFixed(2).padStart(8, ' ')} MB` + 
            `, trx/s: ${Number(transactions/n).toFixed(0).padStart(5, ' ')}` +
            `, avg memory ${Number(averageMemory).toFixed(2).padStart(8, ' ')} MB` + 
            `, avg trx/s: ${Number(average).toFixed(0).padStart(5, ' ')}`
        )
        last = Date.now()
        writeToCSV(stats, path.join(__dirname, 'stats', `stat-nb-clients-${conf.numClients}.${path.basename(process.cwd())}.csv`))
    }
}