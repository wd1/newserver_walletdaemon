module.exports = {
    apps: [{
        name: 'cv-walletdaemon',
        script: './app.js',
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
