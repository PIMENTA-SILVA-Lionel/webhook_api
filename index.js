const express = require('express');
const crypto = require('crypto');
const simpleGit = require('simple-git');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;
const REPO_DIR = '/path/to/your/repo';  // Change this to your repository path
const SECRET = 'your_webhook_secret';   // Replace with your webhook secret

const git = simpleGit(REPO_DIR);

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Middleware to verify GitHub signature
function verifyGitHubSignature(req, res, next) {
    const signature = req.headers['x-hub-signature-256'];
    if (!signature) {
        return res.status(401).send('Signature required');
    }

    const hmac = crypto.createHmac('sha256', SECRET);
    const digest = Buffer.from(`sha256=${hmac.update(JSON.stringify(req.body)).digest('hex')}`, 'utf8');
    const checksum = Buffer.from(signature, 'utf8');

    if (!crypto.timingSafeEqual(digest, checksum)) {
        return res.status(403).send('Invalid signature');
    }

    next();
}

app.post('/webhook', verifyGitHubSignature, (req, res) => {
    const event = req.headers['x-github-event'];

    if (event === 'push' && req.body.ref === 'refs/heads/main') {  // Change 'main' to your branch if needed
        git.pull('origin', 'main', (err, update) => {
            if (err) {
                console.error('Failed to pull latest code:', err);
                return res.status(500).send('Internal Server Error');
            }

            if (update && update.summary.changes) {
                console.log('Repository updated. Building the project...');
                // Run your build command here
                // e.g., `exec('npm run build')`
            }

            res.status(200).send('Webhook received and processed');
        });
    } else {
        res.status(200).send('Not a push to the monitored branch');
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

