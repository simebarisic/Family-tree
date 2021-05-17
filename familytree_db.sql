
--
-- Database: `familytree_db`
--


--
-- Table structure for table `d_users`
--

DROP TABLE IF EXISTS `d_users`;
CREATE TABLE IF NOT EXISTS `d_users` (
  `user_ndx` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `email_address` varchar(255) NOT NULL,
  `family_mem_id` int(10) UNSIGNED DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `user identify number` (`user_ndx`),
  UNIQUE KEY `email_address` (`email_address`)
) ENGINE=MyISAM AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;



--
-- Table structure for table `family_members`
--

DROP TABLE IF EXISTS `family_members`;
CREATE TABLE IF NOT EXISTS `family_members` (
  `mem_id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `first_name` varchar(100) NOT NULL,
  `family_name` varchar(100) NOT NULL,
  `date_of_birth` varchar(100) NOT NULL,
  `gender` tinyint(1) DEFAULT NULL,
  `profession` varchar(255) NOT NULL,
  `father_id` int(10) UNSIGNED DEFAULT NULL,
  `mother_id` int(10) UNSIGNED DEFAULT NULL,
  `husband_wife_id` int(10) UNSIGNED DEFAULT NULL,
  `photo_filename` text,
  `alive_or_dead` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`mem_id`)
) ENGINE=MyISAM AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;

