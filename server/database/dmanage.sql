-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Feb 12, 2026 at 09:12 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `dmanage`
--

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `log_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `action` varchar(255) NOT NULL,
  `timestamp` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `disciplinary_cases`
--

CREATE TABLE `disciplinary_cases` (
  `case_id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `violation_id` int(11) NOT NULL,
  `reported_by` int(11) NOT NULL COMMENT 'Guidance Officer or Admin user_id',
  `date_reported` date NOT NULL,
  `case_status` enum('Pending','Resolved') DEFAULT 'Pending'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `disciplinary_records`
--

CREATE TABLE `disciplinary_records` (
  `record_id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `violation_id` int(11) NOT NULL,
  `reported_by` int(11) DEFAULT NULL,
  `date_reported` date NOT NULL,
  `status` enum('Pending','Resolved','Dismissed') DEFAULT 'Pending'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `role_id` int(11) NOT NULL,
  `role_name` enum('Student','GuidanceOfficer','Admin') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sanctions`
--

CREATE TABLE `sanctions` (
  `sanction_id` int(11) NOT NULL,
  `record_id` int(11) NOT NULL,
  `sanction_type` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `students`
--

CREATE TABLE `students` (
  `student_id` int(11) NOT NULL,
  `first_name` varchar(50) NOT NULL,
  `last_name` varchar(50) NOT NULL,
  `course` varchar(100) DEFAULT NULL,
  `year_level` int(11) DEFAULT NULL,
  `status` enum('Active','Inactive','Suspended') DEFAULT 'Active',
  `contact_number` varchar(20) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `email` varchar(100) DEFAULT NULL,
  `parent_name` varchar(100) DEFAULT NULL,
  `parent_email` varchar(100) DEFAULT NULL,
  `parent_phone` varchar(20) DEFAULT NULL,
  `education_level` enum('Senior High School','College') DEFAULT 'College'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `student_levels`
--

CREATE TABLE `student_levels` (
  `level_id` int(11) NOT NULL,
  `level_name` enum('SHS','College') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `user_id` int(11) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('Super Admin','Discipline Officer','Student') DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `full_name` varchar(100) DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `status` enum('pending','approved','rejected','suspended') DEFAULT 'approved',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `violations`
--

CREATE TABLE `violations` (
  `violation_id` int(11) NOT NULL,
  `violation_name` varchar(100) NOT NULL,
  `category` varchar(50) DEFAULT NULL,
  `severity_level` enum('Minor','Major','Severe') NOT NULL,
  `description` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `violation_categories`
--

CREATE TABLE `violation_categories` (
  `category_id` int(11) NOT NULL,
  `category_name` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`log_id`),
  ADD KEY `fk_audit_user` (`user_id`);

--
-- Indexes for table `disciplinary_cases`
--
ALTER TABLE `disciplinary_cases`
  ADD PRIMARY KEY (`case_id`),
  ADD KEY `student_id` (`student_id`),
  ADD KEY `violation_id` (`violation_id`),
  ADD KEY `reported_by` (`reported_by`);

--
-- Indexes for table `disciplinary_records`
--
ALTER TABLE `disciplinary_records`
  ADD PRIMARY KEY (`record_id`),
  ADD KEY `fk_dr_student` (`student_id`),
  ADD KEY `fk_dr_violation` (`violation_id`),
  ADD KEY `fk_dr_user` (`reported_by`),
  ADD KEY `idx_record_status` (`status`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`role_id`);

--
-- Indexes for table `sanctions`
--
ALTER TABLE `sanctions`
  ADD PRIMARY KEY (`sanction_id`),
  ADD KEY `fk_sanction_record` (`record_id`);

--
-- Indexes for table `students`
--
ALTER TABLE `students`
  ADD PRIMARY KEY (`student_id`),
  ADD KEY `idx_student_number` (`student_id`);

--
-- Indexes for table `student_levels`
--
ALTER TABLE `student_levels`
  ADD PRIMARY KEY (`level_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`);

--
-- Indexes for table `violations`
--
ALTER TABLE `violations`
  ADD PRIMARY KEY (`violation_id`),
  ADD KEY `idx_violation_name` (`violation_name`);

--
-- Indexes for table `violation_categories`
--
ALTER TABLE `violation_categories`
  ADD PRIMARY KEY (`category_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `log_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `disciplinary_cases`
--
ALTER TABLE `disciplinary_cases`
  MODIFY `case_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `disciplinary_records`
--
ALTER TABLE `disciplinary_records`
  MODIFY `record_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `role_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `sanctions`
--
ALTER TABLE `sanctions`
  MODIFY `sanction_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `students`
--
ALTER TABLE `students`
  MODIFY `student_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `student_levels`
--
ALTER TABLE `student_levels`
  MODIFY `level_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `violations`
--
ALTER TABLE `violations`
  MODIFY `violation_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `violation_categories`
--
ALTER TABLE `violation_categories`
  MODIFY `category_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD CONSTRAINT `fk_audit_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `disciplinary_cases`
--
ALTER TABLE `disciplinary_cases`
  ADD CONSTRAINT `disciplinary_cases_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`),
  ADD CONSTRAINT `disciplinary_cases_ibfk_2` FOREIGN KEY (`violation_id`) REFERENCES `violations` (`violation_id`),
  ADD CONSTRAINT `disciplinary_cases_ibfk_3` FOREIGN KEY (`reported_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `disciplinary_records`
--
ALTER TABLE `disciplinary_records`
  ADD CONSTRAINT `fk_dr_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_dr_user` FOREIGN KEY (`reported_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_dr_violation` FOREIGN KEY (`violation_id`) REFERENCES `violations` (`violation_id`) ON UPDATE CASCADE;

--
-- Constraints for table `sanctions`
--
ALTER TABLE `sanctions`
  ADD CONSTRAINT `fk_sanction_record` FOREIGN KEY (`record_id`) REFERENCES `disciplinary_records` (`record_id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
