import { sql } from 'kysely'
import type { PlatformDatabaseModule } from '../../infrastructure/database/database-module.js'

export const agentOsDatabaseModule: PlatformDatabaseModule = {
  name: 'agent-os',
  async migrate(database) {
    await sql.raw(`
      CREATE TABLE IF NOT EXISTS conversations (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        uuid CHAR(8) NOT NULL UNIQUE,
        tenant_id INT NULL,
        user_email VARCHAR(191) NULL,
        surface VARCHAR(80) NOT NULL DEFAULT 'tenant',
        title VARCHAR(255) NOT NULL,
        status VARCHAR(40) NOT NULL DEFAULT 'open',
        metadata JSON NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `).execute(database)

    await sql.raw(`
      CREATE TABLE IF NOT EXISTS agent_logs (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        uuid CHAR(8) NOT NULL UNIQUE,
        conversation_id INT NULL,
        tenant_id INT NULL,
        agent_id VARCHAR(80) NOT NULL,
        event_type VARCHAR(80) NOT NULL,
        model_id VARCHAR(191) NULL,
        input_summary TEXT NULL,
        output_summary TEXT NULL,
        metadata JSON NULL,
        latency_ms INT NULL,
        status VARCHAR(40) NOT NULL DEFAULT 'ok',
        error_message TEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `).execute(database)

    await sql.raw(`
      CREATE TABLE IF NOT EXISTS knowledge_documents (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        uuid CHAR(8) NOT NULL UNIQUE,
        source_type VARCHAR(80) NOT NULL,
        source_path VARCHAR(500) NOT NULL,
        title VARCHAR(255) NOT NULL,
        chunk_key VARCHAR(191) NOT NULL,
        content MEDIUMTEXT NOT NULL,
        metadata JSON NULL,
        status VARCHAR(40) NOT NULL DEFAULT 'active',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_knowledge_chunk (source_type, chunk_key)
      )
    `).execute(database)

    await sql.raw(`
      CREATE TABLE IF NOT EXISTS agent_provider_connections (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        uuid CHAR(8) NOT NULL UNIQUE,
        provider_key VARCHAR(80) NOT NULL UNIQUE,
        provider_name VARCHAR(120) NOT NULL,
        provider_kind VARCHAR(80) NOT NULL,
        base_url VARCHAR(500) NOT NULL,
        api_key_ciphertext TEXT NOT NULL,
        api_key_iv VARCHAR(80) NOT NULL,
        api_key_tag VARCHAR(80) NOT NULL,
        default_model VARCHAR(191) NOT NULL,
        free_models TEXT NULL,
        premium_models TEXT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 0,
        status VARCHAR(40) NOT NULL DEFAULT 'configured',
        last_test_status VARCHAR(40) NULL,
        last_test_message TEXT NULL,
        last_tested_at DATETIME NULL,
        metadata JSON NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `).execute(database)

    await sql.raw(`CREATE INDEX IF NOT EXISTS idx_conversations_tenant ON conversations (tenant_id, updated_at)`).execute(database)
    await sql.raw(`CREATE INDEX IF NOT EXISTS idx_agent_logs_conversation ON agent_logs (conversation_id, created_at)`).execute(database)
    await sql.raw(`CREATE INDEX IF NOT EXISTS idx_agent_logs_agent ON agent_logs (agent_id, created_at)`).execute(database)
    await sql.raw(`CREATE INDEX IF NOT EXISTS idx_knowledge_documents_source ON knowledge_documents (source_type, status)`).execute(database)
    await sql.raw(`CREATE INDEX IF NOT EXISTS idx_agent_provider_connections_active ON agent_provider_connections (is_active, provider_key)`).execute(database)
  },
}
