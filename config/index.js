const compression = require('compression');
const bodyParser = require('body-parser');
const logger = require('morgan');
const lusca = require('lusca');

exports.initConfig = app => {
    /**
     * Express configuration.
     */
    app.set('host', process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0');
    app.set('port', process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8000);
    app.use(compression());
    app.use(logger('dev'));
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(lusca.xframe('SAMEORIGIN'));
    app.use(lusca.xssProtection(true));
    app.disable('x-powered-by');
};
