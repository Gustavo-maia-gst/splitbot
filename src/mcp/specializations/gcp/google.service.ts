import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Logging } from '@google-cloud/logging';
import { ConfigService } from '@config/config.service';

@Injectable()
export class GoogleService implements OnModuleInit {
  private readonly logger = new Logger(GoogleService.name);
  private logging: Logging;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.initializeGcp();
  }

  private initializeGcp() {
    const credentialsB64 = this.configService.get('GOOGLE_CREDENTIALS_B64');
    if (!credentialsB64) {
      this.logger.warn('GOOGLE_CREDENTIALS_B64 not found. GCP tools will not work.');
      return;
    }

    try {
      const credentialsJson = Buffer.from(credentialsB64, 'base64').toString('utf-8');
      const credentials = JSON.parse(credentialsJson);

      this.logging = new Logging({
        projectId: credentials.project_id,
        credentials,
      });

      this.logger.log('GCP Logging client initialized successfully.');
    } catch (err) {
      this.logger.error('Failed to initialize GCP Logging client', err);
    }
  }

  getLoggingClient(): Logging {
    if (!this.logging) {
      throw new Error('GCP Logging client is not initialized.');
    }
    return this.logging;
  }

  async listLogs(
    filters: string[],
    startTime?: Date,
    endTime?: Date,
    limit: number = 100,
  ): Promise<any[]> {
    const client = this.getLoggingClient();

    let filterString = filters.map((f) => `(${f})`).join(' AND ');

    if (startTime) {
      filterString += ` AND timestamp >= "${startTime.toISOString()}"`;
    }
    if (endTime) {
      filterString += ` AND timestamp <= "${endTime.toISOString()}"`;
    }

    try {
      const [entries] = await client.getEntries({
        filter: filterString,
        pageSize: limit,
        orderBy: 'timestamp desc',
      });

      return entries.map((entry) => {
        const metadata = entry.metadata;
        const payload = metadata.jsonPayload || metadata.textPayload || metadata.protoPayload;

        return {
          insertId: metadata.insertId,
          timestamp: metadata.timestamp,
          severity: metadata.severity,
          resource: metadata.resource,
          labels: metadata.labels,
          payload,
        };
      });
    } catch (err) {
      this.logger.error('Error listing logs', err);
      throw err;
    }
  }

  async getLogEntry(insertId: string, timestamp?: Date): Promise<any> {
    const client = this.getLoggingClient();

    // Construct filter to find specific log entry
    // efficient lookup usually requires timestamp or insertId + logName
    // minimal filter: insertId = "..."
    let filterString = `insertId = "${insertId}"`;

    // Narrow down by timestamp if provided to optimize search
    if (timestamp) {
      // Broaden range slightly to ensure we catch it due to potential minor clock diffs or precision
      const start = new Date(timestamp.getTime() - 1000 * 60 * 60); // -1 hour just to be safe/context
      const end = new Date(timestamp.getTime() + 1000 * 60 * 60); // +1 hour
      filterString += ` AND timestamp >= "${start.toISOString()}" AND timestamp <= "${end.toISOString()}"`;
    }

    try {
      const [entries] = await client.getEntries({
        filter: filterString,
        pageSize: 1,
      });

      if (entries.length === 0) {
        return null;
      }

      const entry = entries[0];
      // Return full metadata object
      return entry.metadata;
    } catch (err) {
      this.logger.error(`Error getting log entry ${insertId}`, err);
      throw err;
    }
  }
}
