import { sql, type Kysely } from 'kysely'

type DynamicDatabase = Record<string, Record<string, unknown>>

export async function migrateTaskManagerTables(database: Kysely<DynamicDatabase>) {
  await sql.raw(`
    CREATE TABLE IF NOT EXISTS task_manager_settings (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id INT NOT NULL,
      default_assignee VARCHAR(191) NULL,
      default_reviewer VARCHAR(191) NULL,
      default_priority VARCHAR(80) NOT NULL DEFAULT 'normal',
      default_task_type VARCHAR(80) NOT NULL DEFAULT 'simple_task',
      default_reminder_lead_days INT NOT NULL DEFAULT 0,
      open_task_claiming TINYINT(1) NOT NULL DEFAULT 1,
      require_completion_confirmation TINYINT(1) NOT NULL DEFAULT 0,
      allow_authorized_comments TINYINT(1) NOT NULL DEFAULT 1,
      auto_create_campaign_reminders TINYINT(1) NOT NULL DEFAULT 1,
      campaign_reminder_hour VARCHAR(5) NOT NULL DEFAULT '09:00',
      media_visibility VARCHAR(20) NOT NULL DEFAULT 'private',
      media_folder VARCHAR(160) NOT NULL DEFAULT 'task/files',
      settings JSON NULL,
      updated_by VARCHAR(191) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_task_manager_settings_tenant (tenant_id)
    )
  `).execute(database)

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

  await sql.raw(`ALTER TABLE task_manager_tasks MODIFY priority VARCHAR(80) NOT NULL DEFAULT 'normal'`).execute(database)
  await sql.raw(`ALTER TABLE task_manager_tasks ADD COLUMN IF NOT EXISTS category_id INT NULL AFTER description`).execute(database)
  await sql.raw(`ALTER TABLE task_manager_tasks ADD COLUMN IF NOT EXISTS task_type VARCHAR(80) NULL AFTER category_id`).execute(database)
  await sql.raw(`ALTER TABLE task_manager_tasks ADD COLUMN IF NOT EXISTS source_module VARCHAR(120) NULL AFTER linked_record_label`).execute(database)
  await sql.raw(`ALTER TABLE task_manager_tasks ADD COLUMN IF NOT EXISTS source_record_type VARCHAR(120) NULL AFTER source_module`).execute(database)
  await sql.raw(`ALTER TABLE task_manager_tasks ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(120) NULL AFTER source_record_type`).execute(database)
  await sql.raw(`ALTER TABLE task_manager_tasks ADD COLUMN IF NOT EXISTS source_record_uuid VARCHAR(80) NULL AFTER source_record_id`).execute(database)
  await sql.raw(`ALTER TABLE task_manager_tasks ADD COLUMN IF NOT EXISTS source_record_label VARCHAR(240) NULL AFTER source_record_uuid`).execute(database)
  await sql.raw(`ALTER TABLE task_manager_tasks ADD COLUMN IF NOT EXISTS source_snapshot JSON NULL AFTER source_record_label`).execute(database)
  await sql.raw(`ALTER TABLE task_manager_tasks ADD COLUMN IF NOT EXISTS reviewer VARCHAR(191) NULL AFTER assigned_by`).execute(database)
  await sql.raw(`ALTER TABLE task_manager_tasks ADD COLUMN IF NOT EXISTS claimed_by VARCHAR(191) NULL AFTER reviewer`).execute(database)
  await sql.raw(`ALTER TABLE task_manager_tasks ADD COLUMN IF NOT EXISTS watchers JSON NULL AFTER claimed_by`).execute(database)
  await sql.raw(`ALTER TABLE task_manager_tasks ADD COLUMN IF NOT EXISTS due_at DATETIME NULL AFTER due_date`).execute(database)
  await sql.raw(`ALTER TABLE task_manager_tasks ADD COLUMN IF NOT EXISTS reminder_at DATETIME NULL AFTER due_at`).execute(database)
  await sql.raw(`ALTER TABLE task_manager_tasks ADD COLUMN IF NOT EXISTS recurrence_rule VARCHAR(240) NULL AFTER reminder_at`).execute(database)
  await sql.raw(`ALTER TABLE task_manager_tasks ADD COLUMN IF NOT EXISTS period_key VARCHAR(80) NULL AFTER recurrence_rule`).execute(database)
  await sql.raw(`ALTER TABLE task_manager_tasks ADD COLUMN IF NOT EXISTS first_assigned_at DATETIME NULL AFTER started_at`).execute(database)
  await sql.raw(`ALTER TABLE task_manager_tasks ADD COLUMN IF NOT EXISTS reviewed_at DATETIME NULL AFTER completed_by`).execute(database)
  await sql.raw(`ALTER TABLE task_manager_tasks ADD COLUMN IF NOT EXISTS reopened_count INT NOT NULL DEFAULT 0 AFTER reviewed_at`).execute(database)
  await sql.raw(`ALTER TABLE task_manager_tasks ADD COLUMN IF NOT EXISTS overdue_at DATETIME NULL AFTER reopened_count`).execute(database)
  await sql.raw(`ALTER TABLE task_manager_tasks ADD COLUMN IF NOT EXISTS requires_confirmation TINYINT(1) NOT NULL DEFAULT 0 AFTER auditor_followup_required`).execute(database)
  await sql.raw(`ALTER TABLE task_manager_tasks ADD COLUMN IF NOT EXISTS confirmed_by VARCHAR(191) NULL AFTER requires_confirmation`).execute(database)
  await sql.raw(`ALTER TABLE task_manager_tasks ADD COLUMN IF NOT EXISTS confirmed_at DATETIME NULL AFTER confirmed_by`).execute(database)
  await sql.raw(`ALTER TABLE task_manager_tasks ADD COLUMN IF NOT EXISTS confirmation_payload JSON NULL AFTER confirmed_at`).execute(database)
  await sql.raw(`ALTER TABLE task_manager_tasks ADD COLUMN IF NOT EXISTS result_payload JSON NULL AFTER confirmation_payload`).execute(database)

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

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS task_manager_categories (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id INT NOT NULL,
      name VARCHAR(160) NOT NULL,
      slug VARCHAR(160) NOT NULL,
      color VARCHAR(32) NULL,
      description VARCHAR(500) NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_task_manager_categories_slug (tenant_id, slug),
      INDEX idx_task_manager_categories_active (tenant_id, is_active, name)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS task_manager_tags (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id INT NOT NULL,
      name VARCHAR(160) NOT NULL,
      slug VARCHAR(160) NOT NULL,
      color VARCHAR(32) NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_task_manager_tags_slug (tenant_id, slug),
      INDEX idx_task_manager_tags_active (tenant_id, is_active, name)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS task_manager_task_tags (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      task_id INT NOT NULL,
      tag_id INT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_task_manager_task_tags (task_id, tag_id),
      INDEX idx_task_manager_task_tags_tag (tag_id, task_id)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS task_manager_comments (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      task_id INT NOT NULL,
      parent_comment_id INT NULL,
      actor_email VARCHAR(191) NOT NULL,
      body TEXT NOT NULL,
      visibility VARCHAR(40) NOT NULL DEFAULT 'authorized',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      INDEX idx_task_manager_comments_task (task_id, id),
      INDEX idx_task_manager_comments_parent (parent_comment_id)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS task_manager_attachments (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      task_id INT NOT NULL,
      comment_id INT NULL,
      storage_key VARCHAR(500) NOT NULL,
      file_name VARCHAR(240) NOT NULL,
      mime_type VARCHAR(120) NULL,
      file_size BIGINT NOT NULL DEFAULT 0,
      attachment_type VARCHAR(80) NOT NULL DEFAULT 'file',
      uploaded_by VARCHAR(191) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_task_manager_attachments_task (task_id, id),
      INDEX idx_task_manager_attachments_comment (comment_id, id)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS task_manager_subtasks (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      task_id INT NOT NULL,
      title VARCHAR(240) NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'todo',
      assigned_to VARCHAR(191) NULL,
      due_date DATE NULL,
      completed_by VARCHAR(191) NULL,
      completed_at DATETIME NULL,
      sort_order INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_task_manager_subtasks_task (task_id, sort_order, id)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS task_manager_templates (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id INT NOT NULL,
      name VARCHAR(180) NOT NULL,
      template_type VARCHAR(80) NOT NULL DEFAULT 'simple_task',
      category_id INT NULL,
      default_tags JSON NULL,
      default_priority VARCHAR(80) NOT NULL DEFAULT 'normal',
      default_due_rule VARCHAR(240) NULL,
      requires_confirmation TINYINT(1) NOT NULL DEFAULT 0,
      settings JSON NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_task_manager_templates_tenant (tenant_id, template_type, is_active)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS task_manager_campaigns (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id INT NOT NULL,
      name VARCHAR(220) NOT NULL,
      campaign_type VARCHAR(80) NOT NULL DEFAULT 'record_checklist',
      source_module VARCHAR(120) NULL,
      status VARCHAR(40) NOT NULL DEFAULT 'open',
      generated_by VARCHAR(191) NOT NULL,
      generated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      closed_at DATETIME NULL,
      reset_at DATETIME NULL,
      settings JSON NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_task_manager_campaigns_tenant (tenant_id, status, generated_at)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS task_manager_campaign_items (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      campaign_id INT NOT NULL,
      task_id INT NULL,
      source_module VARCHAR(120) NULL,
      source_record_type VARCHAR(120) NULL,
      source_record_id VARCHAR(120) NULL,
      source_record_uuid VARCHAR(80) NULL,
      source_record_label VARCHAR(240) NULL,
      assigned_to VARCHAR(191) NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'todo',
      is_checked TINYINT(1) NOT NULL DEFAULT 0,
      remarks TEXT NULL,
      result_payload JSON NULL,
      completed_by VARCHAR(191) NULL,
      completed_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_task_manager_campaign_items_campaign (campaign_id, status, id),
      INDEX idx_task_manager_campaign_items_source (source_module, source_record_type, source_record_uuid)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS task_manager_reminders (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id INT NOT NULL,
      task_id INT NULL,
      title VARCHAR(220) NOT NULL,
      remind_at DATETIME NOT NULL,
      recurrence_rule VARCHAR(240) NULL,
      period_key VARCHAR(80) NULL,
      channel VARCHAR(80) NOT NULL DEFAULT 'dashboard',
      status VARCHAR(40) NOT NULL DEFAULT 'pending',
      assigned_to VARCHAR(191) NULL,
      last_sent_at DATETIME NULL,
      next_remind_at DATETIME NULL,
      acknowledged_by VARCHAR(191) NULL,
      acknowledged_at DATETIME NULL,
      completed_by VARCHAR(191) NULL,
      completed_at DATETIME NULL,
      payload JSON NULL,
      created_by VARCHAR(191) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      INDEX idx_task_manager_reminders_due (tenant_id, status, remind_at),
      INDEX idx_task_manager_reminders_task (task_id, status)
    )
  `).execute(database)
}
