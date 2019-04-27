const { createLogger, format, transports } = require('winston');

const path = require('path');

const {
    combine, timestamp, label, printf, splat, json
} = format;

const consoleFormat = printf(({ level,  label, message, timestamp }) => {
    return `${timestamp} [${level.toUpperCase()}] [${typeof label === 'undefined' ? path.basename(process.mainModule.filename) : label}] : ${message}`;
});

const logger = createLogger({
    level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
    format: combine(timestamp({
            format: 'YYYY-MM-DD hh:mm:ss.SSSa'
        }),
        splat(),
        json(),
    ),
    defaultMeta: { service: 'cv-walletdaemon' },
    transports: [
        new transports.Console({
            level: 'debug',
            format: format.combine(consoleFormat),
            handleExceptions: true,
        }),
        /*
        new transports.File({
            filename,
            format: format.combine(
                format.printf(
                    info =>
                        `${info.timestamp} ${info.level} [${info.label}]: ${info.message}`
                )
            )
        })
        */
    ],
    exitOnError: false
});

exports.logger = logger;
