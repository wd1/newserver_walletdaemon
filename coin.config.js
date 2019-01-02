module.exports = {
    apps: [{
        name: 'cwt-coin-daemon',
        script: './services/cryptoPrice.js',
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
