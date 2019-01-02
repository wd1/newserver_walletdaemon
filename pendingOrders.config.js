module.exports = {
    apps: [{
        name: 'cwt-pending-orders-daemon',
        script: './services/pendingOrders.js',
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
