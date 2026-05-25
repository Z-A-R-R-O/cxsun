import { sql, type Kysely } from 'kysely'

type DynamicDatabase = Record<string, Record<string, unknown>>

export async function migrateTaskManagerTables(database: Kysely<DynamicDatabase>) {
  await sql.raw(`
    CREATE TABLE IF NOT EXISTS task_manager_tasks (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id INT NOT NULL,
      company_id INT NULL,
      task_no VARCHAR(120) NOT NULL,
      title VARCHAR(240) NOT NULL,
      subject VARCHAR(240) NULL,
      description TEXT NULL,
      module_key VARCHAR(120) NULL,
      linked_record_id VARCHAR(120) NULL,
      linked_record_label VARCHAR(240) NULL,
      assigned_to VARCHAR(191) NULL,
      assigned_to_name VARCHAR(191) NULL,
      assigned_by VARCHAR(191) NOT NULL,
      priority VARCHAR(24) NOT NULL DEFAULT 'normal',
      status VARCHAR(32) NOT NULL DEFAULT 'todo',
      due_date DATE NULL,
      started_at DATETIME NULL,
      completed_at DATETIME NULL,
      completed_by VARCHAR(191) NULL,
      verification_required TINYINT(1) NOT NULL DEFAULT 0,
      auditor_followup_required TINYINT(1) NOT NULL DEFAULT 0,
      score DOUBLE NOT NULL DEFAULT 0,
      created_by VARCHAR(191) NOT NULL,
      updated_by VARCHAR(191) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      UNIQUE KEY uq_task_manager_task_no (tenant_id, task_no),
      INDEX idx_task_manager_status (tenant_id, status, due_date),
      INDEX idx_task_manager_assigned (tenant_id, assigned_to, status),
      INDEX idx_task_manager_module (tenant_id, module_key, linked_record_id)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS task_manager_activities (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      task_id INT NOT NULL,
      activity_type VARCHAR(80) NOT NULL,
      actor_email VARCHAR(191) NOT NULL,
      message VARCHAR(500) NOT NULL,
      payload JSON NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_task_manager_activities_task (task_id, id)
    )
  `).execute(database)
}
