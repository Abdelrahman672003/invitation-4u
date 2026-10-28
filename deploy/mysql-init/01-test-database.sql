-- Runs once, the first time the development database volume is created: a second database for the tests.
CREATE DATABASE IF NOT EXISTS invite_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
