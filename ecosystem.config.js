module.exports = {
    apps: [{
        name: 'cwt-daemon-all',
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
