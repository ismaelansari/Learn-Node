module.exports = {
    sql: {
        host: 'localhost', //172.17.24.24
        user: 'root', //db5_phpuser
        password: 'root', //95b3ed5b7c669sada4a8e
        database: 'test',
        pool: {
            min: 0,
            max: 10
        },
        debugmode: ['ComQueryPacket'],
        port: 3306,
        multipleStatements: true
    }
}
