module.exports = {
    apps: [{
        name: 'cwt-history-tx-daemon',
        script: './services/historyTransactions.js',
        watch: true,
        exec_interpreter: 'babel-node',
        env: {
            "NODE_ENV": 'development',
        },
        env_production: {
            "NODE_ENV": 'production'
        }
    }]
};
