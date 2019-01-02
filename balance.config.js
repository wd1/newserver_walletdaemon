module.exports = {
    apps: [{
        name: 'cwt-balance-daemon',
        script: './services/ethTokenBalance.js',
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
