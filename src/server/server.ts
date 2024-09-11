import express from 'express';
import { readEnv, writeEnv, EnvEntry } from '../utils/env-manager.js';

const app = express();
const port = 3000;

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
});

app.get('/env', (req, res) => {
    const envData = readEnv();
    res.send(renderEnvList(envData));
});

app.post('/env', (req, res) => {
    const { key, value } = req.body as Record<string, string>;
    if (!key || key.trim() === '') {
        res.status(400).send('Key cannot be empty');
        return;
    }
    const envData = readEnv();
    envData[key.trim()] = value;
    writeEnv(envData);
    res.send(renderEnvList(envData));
});

app.delete('/env/:key', (req, res) => {
    const { key } = req.params;
    const envData = readEnv();
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete envData[key];
    writeEnv(envData);
    res.send(renderEnvList(envData));
});

app.put('/env/:key', (req, res) => {
    const { key } = req.params;
    const { value } = req.body as Record<string, string>;
    const envData = readEnv();
    envData[key] = value;
    writeEnv(envData);
    res.send(renderEnvList(envData));
});

function renderEnvList(envData: EnvEntry): string {
    return `
        <table class="w-full border-collapse" data-last-updated="${Date.now().toString()}">
            <thead>
                <tr>
                    <th class="border p-2 text-left">Key</th>
                    <th class="border p-2 text-left">Value</th>
                    <th class="border p-2 text-left">Actions</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(envData).map(([key, value]) => `
                    <tr>
                        <td class="border p-2">${key}</td>
                        <td class="border p-2">
                            <span contenteditable="true" class="block w-full" data-key="${key}">${value}</span>
                        </td>
                        <td class="border p-2">
                            <button class="btn btn-sm btn-primary edit-btn" onclick="makeEditable(this)">Edit</button>
                            <button class="btn btn-sm btn-error" hx-delete="/env/${key}" hx-target="#env-list">Delete</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
