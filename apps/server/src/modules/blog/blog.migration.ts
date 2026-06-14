import { sql, type Kysely } from 'kysely'

type DynamicDatabase = Record<string, Record<string, unknown>>

export async function migrateBlogTables(database: Kysely<DynamicDatabase>) {
  await sql.raw(`
    CREATE TABLE IF NOT EXISTS blog_categories (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id INT NOT NULL,
      name VARCHAR(180) NOT NULL,
      slug VARCHAR(200) NOT NULL,
      description TEXT NULL,
      parent_id INT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_by VARCHAR(191) NOT NULL,
      updated_by VARCHAR(191) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      INDEX idx_blog_categories_tenant (tenant_id, is_active, sort_order),
      INDEX idx_blog_categories_slug (tenant_id, slug)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS blog_tags (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id INT NOT NULL,
      name VARCHAR(120) NOT NULL,
      slug VARCHAR(140) NOT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_by VARCHAR(191) NOT NULL,
      updated_by VARCHAR(191) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      INDEX idx_blog_tags_tenant (tenant_id, is_active, name),
      INDEX idx_blog_tags_slug (tenant_id, slug)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS blog_posts (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      slug VARCHAR(280) NOT NULL,
      content LONGTEXT NULL,
      excerpt TEXT NULL,
      featured_image VARCHAR(500) NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'draft',
      author_email VARCHAR(191) NULL,
      category_id INT NULL,
      published_at DATETIME NULL,
      is_featured TINYINT(1) NOT NULL DEFAULT 0,
      allow_comments TINYINT(1) NOT NULL DEFAULT 1,
      view_count INT NOT NULL DEFAULT 0,
      created_by VARCHAR(191) NOT NULL,
      updated_by VARCHAR(191) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      INDEX idx_blog_posts_tenant (tenant_id, status, published_at),
      INDEX idx_blog_posts_category (tenant_id, category_id, status),
      INDEX idx_blog_posts_author (tenant_id, author_email, status),
      INDEX idx_blog_posts_slug (tenant_id, slug),
      INDEX idx_blog_posts_published (tenant_id, status, published_at, is_featured)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS blog_post_tags (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      post_id INT NOT NULL,
      tag_id INT NOT NULL,
      UNIQUE KEY uq_blog_post_tag (post_id, tag_id),
      INDEX idx_blog_post_tags_post (post_id),
      INDEX idx_blog_post_tags_tag (tag_id)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS blog_comments (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id INT NOT NULL,
      post_id INT NOT NULL,
      parent_id INT NULL,
      author_name VARCHAR(120) NOT NULL,
      author_email VARCHAR(191) NOT NULL,
      author_website VARCHAR(500) NULL,
      content TEXT NOT NULL,
      is_approved TINYINT(1) NOT NULL DEFAULT 0,
      approved_by VARCHAR(191) NULL,
      approved_at DATETIME NULL,
      created_by VARCHAR(191) NULL,
      updated_by VARCHAR(191) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      INDEX idx_blog_comments_post (tenant_id, post_id, is_approved, created_at),
      INDEX idx_blog_comments_parent (post_id, parent_id)
    )
  `).execute(database)

  try { await sql.raw(`ALTER TABLE blog_comments ADD COLUMN is_review TINYINT(1) NOT NULL DEFAULT 0 AFTER is_approved`).execute(database) } catch (_e) { /* column may already exist */ }

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS blog_ratings (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id INT NOT NULL,
      post_id INT NOT NULL,
      author_email VARCHAR(191) NOT NULL,
      rating TINYINT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_blog_rating (post_id, author_email),
      INDEX idx_blog_ratings_post (tenant_id, post_id, rating),
      INDEX idx_blog_ratings_author (tenant_id, author_email)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS blog_likes (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NOT NULL,
      post_id INT NOT NULL,
      author_email VARCHAR(191) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_blog_like (post_id, author_email),
      INDEX idx_blog_likes_post (tenant_id, post_id),
      INDEX idx_blog_likes_author (tenant_id, author_email)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS blog_shares (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id INT NOT NULL,
      post_id INT NOT NULL,
      platform VARCHAR(60) NOT NULL,
      url VARCHAR(500) NULL,
      count INT NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_blog_share (post_id, platform),
      INDEX idx_blog_shares_post (tenant_id, post_id, platform),
      INDEX idx_blog_shares_platform (tenant_id, platform, count)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS blog_images (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id INT NOT NULL,
      post_id INT NULL,
      filename VARCHAR(255) NOT NULL,
      original_name VARCHAR(255) NOT NULL,
      mime_type VARCHAR(80) NOT NULL DEFAULT 'image/webp',
      size_bytes INT NOT NULL DEFAULT 0,
      url VARCHAR(500) NOT NULL,
      alt_text VARCHAR(255) NULL,
      caption TEXT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      is_featured TINYINT(1) NOT NULL DEFAULT 0,
      created_by VARCHAR(191) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL,
      INDEX idx_blog_images_post (tenant_id, post_id, sort_order),
      INDEX idx_blog_images_tenant (tenant_id, created_at)
    )
  `).execute(database)

  await sql.raw(`
    CREATE TABLE IF NOT EXISTS blog_seo (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL UNIQUE,
      tenant_id INT NOT NULL,
      post_id INT NOT NULL,
      meta_title VARCHAR(180) NULL,
      meta_description VARCHAR(320) NULL,
      meta_keywords VARCHAR(500) NULL,
      canonical_url VARCHAR(500) NULL,
      og_title VARCHAR(180) NULL,
      og_description VARCHAR(320) NULL,
      og_image VARCHAR(500) NULL,
      schema_markup TEXT NULL,
      no_index TINYINT(1) NOT NULL DEFAULT 0,
      created_by VARCHAR(191) NOT NULL,
      updated_by VARCHAR(191) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_blog_seo_post (post_id),
      INDEX idx_blog_seo_tenant (tenant_id, post_id)
    )
  `).execute(database)
}
