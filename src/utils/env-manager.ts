import fs from 'fs';
import path from 'path';

export interface EnvEntry {
    [key: string]: string;
}

const envPath = path.join(process.cwd(), '.env');

export function readEnv(): EnvEntry {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const envLines = envContent.split('\n');
    const envData: EnvEntry = {};

    envLines.forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            envData[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
        }
    });

    return envData;
}

export function writeEnv(envData: EnvEntry): void {
    const envContent = Object.entries(envData)
        .map(([key, value]) => `${key}="${value}"`)
        .join('\n');
    fs.writeFileSync(envPath, envContent);
}
