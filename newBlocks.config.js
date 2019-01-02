module.exports = {
    apps: [{
        name: 'cwt-process-new-blocks',
        script: './services/processNewBlocks.js',
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
