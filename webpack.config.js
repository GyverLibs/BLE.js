module.exports = {
    entry: './ble.js',
    output: {
        path: __dirname,
        filename: 'ble.min.js',
        library: {
            type: 'module'
        }
    },
    experiments: {
        outputModule: true
    },
    mode: "production",
};