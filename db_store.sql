-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Nov 01, 2023 at 04:00 PM
-- Server version: 10.4.28-MariaDB
-- PHP Version: 8.2.4

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `db_store`
--

-- --------------------------------------------------------

--
-- Table structure for table `tb_order`
--

CREATE TABLE `tb_order` (
  `order_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `address` text NOT NULL,
  `email` varchar(100) NOT NULL,
  `tel` varchar(50) NOT NULL,
  `status` varchar(50) NOT NULL,
  `created_date` datetime NOT NULL,
  `payment_id` int(11) DEFAULT NULL,
  `send_date` datetime DEFAULT NULL,
  `shipping_name` varchar(50) DEFAULT NULL,
  `shipping_tracking` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tb_order`
--

INSERT INTO `tb_order` (`order_id`, `user_id`, `name`, `address`, `email`, `tel`, `status`, `created_date`, `payment_id`, `send_date`, `shipping_name`, `shipping_tracking`) VALUES
(26, 1, 'Loechai Boonngok', '72/511 Prapawan Village, Suwintawong Rd., Saensaeb, Minburi', 'chinloechai@gmail.com', '944060440', 'Shipped', '2023-10-10 23:37:58', 25, '2023-10-13 03:53:00', 'Flash', '1534FGAF22'),
(27, 1, 'Loechai Boonngok', '72/511 Prapawan Village, Suwintawong Rd., Saensaeb, Minburi', 'chinloechai@gmail.com', '944060440', 'Shipped', '2023-10-13 03:52:27', 26, '2023-10-13 03:52:00', 'Kerry', '1534FGAF22');

-- --------------------------------------------------------

--
-- Table structure for table `tb_order_detail`
--

CREATE TABLE `tb_order_detail` (
  `order_detail_id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `qty` int(11) NOT NULL,
  `total_price` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tb_order_detail`
--

INSERT INTO `tb_order_detail` (`order_detail_id`, `order_id`, `product_id`, `qty`, `total_price`) VALUES
(52, 26, 59, 1, 2190),
(53, 26, 58, 2, 7980),
(54, 27, 54, 4, 18360);

-- --------------------------------------------------------

--
-- Table structure for table `tb_payment`
--

CREATE TABLE `tb_payment` (
  `payment_id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL,
  `transfer_receipt_img` varchar(255) NOT NULL,
  `pay_date` datetime NOT NULL,
  `pay_remark` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tb_payment`
--

INSERT INTO `tb_payment` (`payment_id`, `order_id`, `transfer_receipt_img`, `pay_date`, `pay_remark`) VALUES
(25, 26, '20231011000427DSC02017.jpg', '2023-10-11 00:04:00', ''),
(26, 27, '20231013035236DSC02107.jpg', '2023-10-13 03:52:00', '');

-- --------------------------------------------------------

--
-- Table structure for table `tb_product`
--

CREATE TABLE `tb_product` (
  `product_id` int(11) NOT NULL,
  `product_name` varchar(255) NOT NULL,
  `product_group_id` int(11) NOT NULL,
  `cost_price` int(11) DEFAULT NULL,
  `selling_price` int(11) DEFAULT NULL,
  `img` varchar(255) DEFAULT NULL,
  `barcode` varchar(50) DEFAULT NULL,
  `product_stock` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tb_product`
--

INSERT INTO `tb_product` (`product_id`, `product_name`, `product_group_id`, `cost_price`, `selling_price`, `img`, `barcode`, `product_stock`) VALUES
(48, 'Dell UltraSharp U2723QE 27\" IPS 4K Monitor 60Hz', 6, 16990, 23790, '20230928221056dell-ultrasharp-u2723qe-27-inch-ips-4k-monitor-60hz-front-right.jpg', '1941113000001', 2),
(49, 'SteelSeries Arctis Nova Pro Wireless Gaming Headset', 7, 13000, 16500, '20230928221133download.jpg', '1503094000001', 2),
(50, 'Sony WH-1000XM4 Wireless Headphone', 7, 9490, 13990, '20230928221418download.jpg', '1137132000001', 0),
(51, 'Creative Pebble 2.0 Computer Speaker', 11, 550, 590, '20230928221544creative-pebble-2-0-computer-speaker-black-cover-view.jpg', '1415072000001', 0),
(52, 'Logitech MX Anywhere 3S Wireless Mouse', 8, 1990, 2590, '20230928221710logitech-mx-anywhere-3s-wireless-mouse-pale-grey-top-view.webp', '1532234000002', 0),
(53, 'Ergotrend Ergo Mouse 01 Wireless Mouse', 8, 790, 1590, '20230928221801ergotrend-ergo-mouse-01-mouse-cover-view.jpg', '2156104000001', 1),
(54, 'Logitech MX Master 3 Wireless Mouse', 8, 3290, 4590, '20230928221846Logitech-MX-Master-3-1.jpg', '1532136000003', 5),
(55, 'Razer Strider Gaming Mousepad', 10, 990, 1690, '20230928222020razer-strider-gaming-mousepad-quartz-large-top-view.webp', '1516222000003', 5),
(56, 'Pulsar ES2 Bruce Lee Edition Mousepad', 10, 1350, 1790, '20230928222150pulsar-es2-bruce-lee-edition-mousepad-xl-yellow-top-view.webp', '2337028000001', 2),
(57, 'Darmoshark K8 Wireless Mechanical Keyboard', 9, 2290, 2990, '20230928222329darmoshark-k8-wireless-mechanical-keyboard-white-top-view.webp', '2387007000001', 2),
(58, 'Leopold FC660M Mechanical Keyboard', 9, 2990, 3990, '20230928222404LEOPOLD-FC660M-4.jpg', '2020011000013', 4),
(59, 'Akko 3087DS TKL Horizon Switch V2 Gaming Keyboard', 9, 1190, 2190, '20230928222452akko-3087ds-tkl-horizon-switch-v2-gaming-keyboard-01(4)(1).jpg', '1959046000003', 9);

-- --------------------------------------------------------

--
-- Table structure for table `tb_product_group`
--

CREATE TABLE `tb_product_group` (
  `product_group_id` int(11) NOT NULL,
  `product_group_name` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tb_product_group`
--

INSERT INTO `tb_product_group` (`product_group_id`, `product_group_name`) VALUES
(6, 'TV'),
(7, 'Headset / In-ear'),
(8, 'Mouse'),
(9, 'Keyboard'),
(10, 'Mousepad'),
(11, 'Speaker');

-- --------------------------------------------------------

--
-- Table structure for table `tb_stock_in`
--

CREATE TABLE `tb_stock_in` (
  `stock_in_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `qty` int(11) NOT NULL,
  `created_date` datetime NOT NULL,
  `remark` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tb_stock_in`
--

INSERT INTO `tb_stock_in` (`stock_in_id`, `product_id`, `qty`, `created_date`, `remark`) VALUES
(10, 59, 5, '2023-10-03 15:57:35', 'First lot'),
(11, 59, 2, '2023-10-03 16:58:31', 'ADD ANOTHER 2 KEYBOARD'),
(12, 58, 3, '2023-10-04 14:18:17', ''),
(13, 58, 1, '2023-10-04 14:18:23', ''),
(14, 57, 2, '2023-10-04 14:18:37', ''),
(15, 56, 2, '2023-10-04 14:19:13', ''),
(16, 55, 1, '2023-10-04 14:19:31', ''),
(17, 55, 4, '2023-10-04 14:19:36', ''),
(18, 54, 2, '2023-10-04 14:20:14', ''),
(19, 54, 3, '2023-10-04 14:20:19', ''),
(20, 53, 1, '2023-10-04 14:20:40', ''),
(21, 49, 2, '2023-10-04 14:20:52', ''),
(22, 48, 2, '2023-10-04 14:21:02', ''),
(23, 59, 3, '2023-10-13 16:58:16', '');

-- --------------------------------------------------------

--
-- Table structure for table `tb_stock_out`
--

CREATE TABLE `tb_stock_out` (
  `stock_out_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `qty` int(11) NOT NULL,
  `created_date` datetime NOT NULL,
  `remark` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tb_stock_out`
--

INSERT INTO `tb_stock_out` (`stock_out_id`, `product_id`, `qty`, `created_date`, `remark`) VALUES
(6, 59, 1, '2023-10-04 14:09:59', 'CUSTOMER Purchased');

-- --------------------------------------------------------

--
-- Table structure for table `tb_user`
--

CREATE TABLE `tb_user` (
  `id` int(11) NOT NULL,
  `name` varchar(30) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `level` varchar(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tb_user`
--

INSERT INTO `tb_user` (`id`, `name`, `username`, `password`, `level`) VALUES
(16, 'MasterAdmin', 'myadmin001', '$2b$10$toriFKZr.0Bbe82IZXvR8uScdLSgCq1gIzkCVXxs0Iu8H/eFNhSJ.', 'Admin'),
(19, 'User001', 'myuser001', '$2b$10$SXOSRUUs/SvvIpG6rvWbNe3mh4FWFIJE5XDhIp9Wegb487opp8QeW', 'User'),
(20, 'User002', 'myuser002', '$2b$10$VDVG6XdbC8mAd/Qbi2HTZ..5T2XLklc2EAIW0NIJG2Wz5Oxt15WA6', 'User'),
(21, 'Admin002', 'myadmin002', '$2b$10$kLw2By44FiQYC4NawdgB6.neEs7aa6u4zhzK/eXEH8PD9hC4PQHXm', 'Admin');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `tb_order`
--
ALTER TABLE `tb_order`
  ADD PRIMARY KEY (`order_id`);

--
-- Indexes for table `tb_order_detail`
--
ALTER TABLE `tb_order_detail`
  ADD PRIMARY KEY (`order_detail_id`);

--
-- Indexes for table `tb_payment`
--
ALTER TABLE `tb_payment`
  ADD PRIMARY KEY (`payment_id`);

--
-- Indexes for table `tb_product`
--
ALTER TABLE `tb_product`
  ADD PRIMARY KEY (`product_id`);

--
-- Indexes for table `tb_product_group`
--
ALTER TABLE `tb_product_group`
  ADD PRIMARY KEY (`product_group_id`);

--
-- Indexes for table `tb_stock_in`
--
ALTER TABLE `tb_stock_in`
  ADD PRIMARY KEY (`stock_in_id`);

--
-- Indexes for table `tb_stock_out`
--
ALTER TABLE `tb_stock_out`
  ADD PRIMARY KEY (`stock_out_id`);

--
-- Indexes for table `tb_user`
--
ALTER TABLE `tb_user`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `tb_order`
--
ALTER TABLE `tb_order`
  MODIFY `order_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;

--
-- AUTO_INCREMENT for table `tb_order_detail`
--
ALTER TABLE `tb_order_detail`
  MODIFY `order_detail_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=55;

--
-- AUTO_INCREMENT for table `tb_payment`
--
ALTER TABLE `tb_payment`
  MODIFY `payment_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=27;

--
-- AUTO_INCREMENT for table `tb_product`
--
ALTER TABLE `tb_product`
  MODIFY `product_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=67;

--
-- AUTO_INCREMENT for table `tb_product_group`
--
ALTER TABLE `tb_product_group`
  MODIFY `product_group_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `tb_stock_in`
--
ALTER TABLE `tb_stock_in`
  MODIFY `stock_in_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT for table `tb_stock_out`
--
ALTER TABLE `tb_stock_out`
  MODIFY `stock_out_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT for table `tb_user`
--
ALTER TABLE `tb_user`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
