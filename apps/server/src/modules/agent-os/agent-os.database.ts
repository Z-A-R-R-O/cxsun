import { sql } from 'kysely'
import type { PlatformDatabaseModule } from '../../infrastructure/database/database-module.js'

export const agentOsDatabaseModule: PlatformDatabaseModule = {
  name: 'agent-os',
  async migrate(database) {
    await sql.raw(`
      CREATE TABLE IF NOT EXISTS conversations (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        uuid CHAR(8) NOT NULL UNIQUE,
        tenant_id INT NOT NULL DEFAULT 0,
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

    await sql.raw(`
      CREATE TABLE IF NOT EXISTS zetro_query_tools (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        uuid CHAR(8) NOT NULL UNIQUE,
        tool_key VARCHAR(120) NOT NULL UNIQUE,
        intent_key VARCHAR(120) NOT NULL,
        domain VARCHAR(80) NOT NULL,
        label VARCHAR(191) NOT NULL,
        description TEXT NULL,
        required_fields JSON NULL,
        examples JSON NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        status VARCHAR(40) NOT NULL DEFAULT 'approved',
        metadata JSON NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `).execute(database)

    await sql.raw(`
      CREATE TABLE IF NOT EXISTS zetro_query_mappings (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        uuid CHAR(8) NOT NULL UNIQUE,
        tenant_id INT NULL,
        phrase VARCHAR(255) NOT NULL,
        normalized_phrase VARCHAR(255) NOT NULL,
        match_type VARCHAR(40) NOT NULL DEFAULT 'exact',
        tool_key VARCHAR(120) NOT NULL,
        intent_key VARCHAR(120) NOT NULL,
        status VARCHAR(40) NOT NULL DEFAULT 'approved',
        hit_count INT NOT NULL DEFAULT 0,
        last_matched_at DATETIME NULL,
        created_by VARCHAR(191) NULL,
        metadata JSON NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_zetro_query_mapping (tenant_id, normalized_phrase, tool_key)
      )
    `).execute(database)

    await sql.raw(`
      CREATE TABLE IF NOT EXISTS zetro_query_logs (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        uuid CHAR(8) NOT NULL UNIQUE,
        conversation_id INT NULL,
        tenant_id INT NULL,
        tenant_slug VARCHAR(191) NULL,
        user_role VARCHAR(80) NULL,
        question TEXT NOT NULL,
        normalized_question VARCHAR(255) NOT NULL,
        mapped_intent VARCHAR(120) NULL,
        tool_key VARCHAR(120) NULL,
        mapping_id INT NULL,
        source VARCHAR(80) NOT NULL DEFAULT 'builtin',
        status VARCHAR(40) NOT NULL DEFAULT 'answered',
        missing_fields JSON NULL,
        metadata JSON NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `).execute(database)

    await sql.raw(`CREATE INDEX IF NOT EXISTS idx_conversations_tenant ON conversations (tenant_id, updated_at)`).execute(database)
    await sql.raw(`CREATE INDEX IF NOT EXISTS idx_agent_logs_conversation ON agent_logs (conversation_id, created_at)`).execute(database)
    await sql.raw(`CREATE INDEX IF NOT EXISTS idx_agent_logs_agent ON agent_logs (agent_id, created_at)`).execute(database)
    await sql.raw(`CREATE INDEX IF NOT EXISTS idx_knowledge_documents_source ON knowledge_documents (source_type, status)`).execute(database)
    await sql.raw(`CREATE INDEX IF NOT EXISTS idx_agent_provider_connections_active ON agent_provider_connections (is_active, provider_key)`).execute(database)
    await sql.raw(`CREATE INDEX IF NOT EXISTS idx_zetro_query_tools_active ON zetro_query_tools (is_active, tool_key)`).execute(database)
    await sql.raw(`CREATE INDEX IF NOT EXISTS idx_zetro_query_mappings_status ON zetro_query_mappings (status, match_type)`).execute(database)
    await sql.raw(`CREATE INDEX IF NOT EXISTS idx_zetro_query_logs_tenant ON zetro_query_logs (tenant_id, created_at)`).execute(database)
    await seedZetroQueryRegistry(database)
  },
}

async function seedZetroQueryRegistry(database: Parameters<PlatformDatabaseModule['migrate']>[0]) {
  const tools = [
    {
      uuid: 'zqtsales',
      toolKey: 'sales.summary',
      intentKey: 'sales.summary',
      domain: 'sales',
      label: 'Sales summary',
      description: 'Sales count, total, paid, balance, and recent invoices for the signed-in tenant.',
      requiredFields: [],
      examples: ['Show sales summary', 'This month sales report'],
    },
    {
      uuid: 'zqtprsum',
      toolKey: 'purchase.summary',
      intentKey: 'purchase.summary',
      domain: 'purchase',
      label: 'Purchase summary',
      description: 'Purchase count, total, paid, balance, and recent bills for the signed-in tenant.',
      requiredFields: [],
      examples: ['Show purchase summary', 'Last month purchase report'],
    },
    {
      uuid: 'zqtbalan',
      toolKey: 'contact.balance',
      intentKey: 'contact.balance',
      domain: 'contact',
      label: 'Contact balance',
      description: 'Customer receivable, supplier payable, or combined contact balance by party name.',
      requiredFields: ['partyName'],
      examples: ['Customer balance for ABC Textiles', 'Payable to Krishna Traders'],
    },
    {
      uuid: 'zqtsbill',
      toolKey: 'sales.bill.detail',
      intentKey: 'sales.bill.detail',
      domain: 'sales',
      label: 'Sales bill details',
      description: 'Sales invoice totals, payment status, and item lines when a single invoice is matched.',
      requiredFields: ['documentNo or partyName'],
      examples: ['Sales invoice INV-102 details', 'Show recent sales bills for ABC Textiles'],
    },
    {
      uuid: 'zqtpbill',
      toolKey: 'purchase.bill.detail',
      intentKey: 'purchase.bill.detail',
      domain: 'purchase',
      label: 'Purchase bill details',
      description: 'Purchase bill totals, supplier bill reference, payment status, and item lines when a single bill is matched.',
      requiredFields: ['documentNo or partyName'],
      examples: ['Purchase bill PB-88 details', 'Show purchase bills for Krishna Traders'],
    },
  ]

  for (const tool of tools) {
    await sql`
      INSERT INTO zetro_query_tools (
        uuid,
        tool_key,
        intent_key,
        domain,
        label,
        description,
        required_fields,
        examples,
        is_active,
        status,
        updated_at
      )
      VALUES (
        ${tool.uuid},
        ${tool.toolKey},
        ${tool.intentKey},
        ${tool.domain},
        ${tool.label},
        ${tool.description},
        ${JSON.stringify(tool.requiredFields)},
        ${JSON.stringify(tool.examples)},
        1,
        'approved',
        CURRENT_TIMESTAMP
      )
      ON DUPLICATE KEY UPDATE
        intent_key = VALUES(intent_key),
        domain = VALUES(domain),
        label = VALUES(label),
        description = VALUES(description),
        required_fields = VALUES(required_fields),
        examples = VALUES(examples),
        is_active = 1,
        status = 'approved',
        updated_at = CURRENT_TIMESTAMP
    `.execute(database)
  }
}
