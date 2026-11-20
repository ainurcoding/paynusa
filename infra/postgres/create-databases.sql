-- Membuat satu database dan satu user per service di satu instance PostgreSQL
-- (ADR 0006). Aman dijalankan berulang kali.
--
-- Password dikirim lewat variabel psql (auth_pw, wallet_pw, transaction_pw,
-- audit_pw), tidak ditulis di file ini. Lihat setup.ps1.

\set ON_ERROR_STOP on

-- Role (user) per service
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', 'auth_user', :'auth_pw')
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'auth_user') \gexec

SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', 'wallet_user', :'wallet_pw')
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'wallet_user') \gexec

SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', 'transaction_user', :'transaction_pw')
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'transaction_user') \gexec

SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', 'audit_user', :'audit_pw')
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'audit_user') \gexec

-- Database per service
SELECT 'CREATE DATABASE auth_db OWNER auth_user'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'auth_db') \gexec

SELECT 'CREATE DATABASE wallet_db OWNER wallet_user'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'wallet_db') \gexec

SELECT 'CREATE DATABASE wallet_test_db OWNER wallet_user'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'wallet_test_db') \gexec

SELECT 'CREATE DATABASE transaction_db OWNER transaction_user'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'transaction_db') \gexec

SELECT 'CREATE DATABASE audit_db OWNER audit_user'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'audit_db') \gexec

-- Hanya pemilik yang boleh terhubung ke database-nya (cabut akses PUBLIC)
REVOKE ALL ON DATABASE auth_db FROM PUBLIC;
REVOKE ALL ON DATABASE wallet_db FROM PUBLIC;
REVOKE ALL ON DATABASE wallet_test_db FROM PUBLIC;
REVOKE ALL ON DATABASE transaction_db FROM PUBLIC;
REVOKE ALL ON DATABASE audit_db FROM PUBLIC;
