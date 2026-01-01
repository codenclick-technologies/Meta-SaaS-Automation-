const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const readline = require('readline');
const config = require('./config');

const backupDir = path.join(__dirname, '../backups');

// Check if backups directory exists
if (!fs.existsSync(backupDir)) {
    console.error(`No backups directory found at ${backupDir}`);
    process.exit(1);
}

// Get list of backups
const backups = fs.readdirSync(backupDir).filter(file => {
    return fs.statSync(path.join(backupDir, file)).isDirectory();
}).sort().reverse(); // Newest first

if (backups.length === 0) {
    console.log('No backups found.');
    process.exit(0);
}

// Display backups
console.log('\nAvailable Backups:');
backups.forEach((backup, index) => {
    console.log(`${index + 1}. ${backup}`);
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('\nEnter the number of the backup to restore (or 0 to cancel): ', (answer) => {
    const index = parseInt(answer) - 1;

    if (answer === '0') {
        console.log('Cancelled.');
        rl.close();
        process.exit(0);
    }

    if (isNaN(index) || index < 0 || index >= backups.length) {
        console.error('Invalid selection.');
        rl.close();
        process.exit(1);
    }

    const selectedBackup = backups[index];
    const backupPath = path.join(backupDir, selectedBackup);

    console.log(`\nPreparing to restore from: ${selectedBackup}`);
    console.log('WARNING: This will overwrite the current database with the backup data.');

    rl.question('Type "CONFIRM" to proceed: ', (confirm) => {
        if (confirm !== 'CONFIRM') {
            console.log('Restore cancelled.');
            rl.close();
            process.exit(0);
        }

        console.log('Starting restore process... (This may take a while)');

        // mongorestore command
        // --drop: Drops the collections from the target database before restoring the collections from the dumped backup.
        // --uri: Connection string
        const cmd = `mongorestore --uri="${config.mongoUri}" --drop "${backupPath}"`;

        const restoreProcess = exec(cmd);

        restoreProcess.stdout.on('data', (data) => console.log(data.toString()));
        restoreProcess.stderr.on('data', (data) => console.error(data.toString())); // mongorestore logs to stderr

        restoreProcess.on('exit', (code) => {
            if (code === 0) {
                console.log('\n✅ Database restored successfully!');
            } else {
                console.error(`\n❌ Restore failed with exit code ${code}`);
            }
            rl.close();
        });
    });
});