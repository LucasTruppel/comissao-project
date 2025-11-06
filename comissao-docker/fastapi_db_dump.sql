-- MySQL dump 10.13  Distrib 8.0.43, for Linux (x86_64)
--
-- Host: 127.0.0.1    Database: fastapi_db
-- ------------------------------------------------------
-- Server version	8.0.43

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `agentes_validacao`
--

DROP TABLE IF EXISTS `agentes_validacao`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `agentes_validacao` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(255) NOT NULL,
  `cpf` varchar(11) NOT NULL,
  `localidade_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_agentes_validacao_cpf` (`cpf`),
  KEY `localidade_id` (`localidade_id`),
  KEY `ix_agentes_validacao_id` (`id`),
  CONSTRAINT `agentes_validacao_ibfk_1` FOREIGN KEY (`localidade_id`) REFERENCES `localidades_atendimento` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=61 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `agentes_validacao`
--

LOCK TABLES `agentes_validacao` WRITE;
/*!40000 ALTER TABLE `agentes_validacao` DISABLE KEYS */;
INSERT INTO `agentes_validacao` VALUES (1,'RAFAEL DO NASCIMENTO ADORNO RIOS','86280629554',1),(2,'JENNIFER CAROLINE MENDES MOREIRA','48647345851',10),(3,'LALESKA SILVA DANTAS','41146283806',11),(4,'JESSICA SANTOS DA SILVA','42758112833',10),(5,'Andreza Lima Santos','86255949567',2),(6,'Sandra Regina Cardoso Marcelino','31191603857',8),(7,'MARIANA APARECIDA BALBINO DA SILVA','47462579812',32),(8,'Vanderlucia Silva Celestino','13646065850',3),(9,'ISABELLA VITORIA FERREIRA DAVID','49122950869',8),(10,'Artulio Moreira de Matos','41581637810',7),(11,'FELIPE DE ALMEIDA SANTOS','44673634837',6),(12,'BEATRIZ CALDEIRA LASS SANTOS','53643190832',11),(13,'Gabriel de Campos Simao','47856708867',4),(14,'Neusa Navarro Regiani Paziani','12715825897',5),(15,'TAYNARA THOBIAS DONIZETH','51924089890',6),(16,'BRUNA ALBINA DE BRITO','49653380818',10),(17,'MAURILIO ALMEIDA BARBOSA','42288445882',9),(18,'Christiane de Barros Caruso','12153784832',16),(19,'CAROLINE ROCHA SOUSA','37314169802',7),(20,'LETICIA ANDRADE CARDOSO SILVA','50036362883',23),(21,'UGLEVIA CARNEIRO SILVA','02951349505',10),(22,'Ana Paula Amorim Souza Ferreira','30668211881',9),(23,'Erica Medina Chrisostomo Raymundo','34130027832',10),(24,'BIANCA RAQUEL DE OLIVEIRA BARBOSA','45836234884',10),(25,'Mariana Trajano da Silva','35710329851',14),(26,'JULIA DE FRANCA CASTRO SILVA','38888317848',15),(27,'Thaina Aparecida Goncalves Silva','45417347884',12),(28,'Carolina Vilaronga Feliciano Ruy','48410609878',13),(29,'JOAO JULIANO AMARANTE DA SILVA','46670464819',10),(30,'CLARA THAIS SILVA SANTANA','62324688301',17),(31,'Vinicius de La Torre Freitas','48011825852',18),(32,'FERNANDA VEGLIONE','47894680893',18),(33,'GABRIEL DA SILVA MOREIRA','50653587880',9),(34,'ANA BEATRIZ SOARES LEMOS','51319324835',18),(35,'Jessiane pereira da silva','44003171888',7),(36,'TATIANA PEREIRA DAS DORES','40406864896',8),(37,'Erick Henrique Pereira da Silva','38224634850',20),(38,'Mayara Batista Rodrigues','38896675898',10),(39,'Joise Castro dos Santos Magnavita','02331983500',21),(40,'Antonio Carlos de Souza Freitas','00331474263',22),(41,'THAIS SOUSA DA ROCHA','40421930802',11),(42,'Allan Moreira Silva','39129341850',10),(43,'Alceno Almeida dos Passos','19282831876',10),(44,'Juliana Duarte Silva Salgueiro','38003920892',24),(45,'Wellington Americo dos Santos Nascimento','06517357505',2),(46,'Maick Douglas Sanches','41291430857',10),(47,'Adriana Ferreira Malaquias','32503371884',25),(48,'Celia Martins Bezerra','39778985820',26),(49,'KAUAN ARAUJO BARBOSA','50985452854',10),(50,'SAMA CERQUEIRA DOS SANTOS','53911465858',18),(51,'Sirlene das Gracas Ribeiro','06572989992',27),(52,'Vilma Perez de Santana','29747475820',28),(53,'Estefanie Murta Kowaski','39650770828',29),(54,'MARIA APARECIDA GALVAO BORGES DE SOUZA','11148468803',26),(55,'Aline Rocha De Araujo','43456409893',30),(56,'VICTORIA VASCONCELOS DE ARAUJO','47151700865',3),(57,'Nelson Jarson de Araujo','33804818153',31),(58,'JESSICA GOMES DOS SANTOS','41802148817',10),(60,'THAIS GESUS PIRES FERREIRA','36901809883',10);
/*!40000 ALTER TABLE `agentes_validacao` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `localidades_atendimento`
--

DROP TABLE IF EXISTS `localidades_atendimento`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `localidades_atendimento` (
  `id` int NOT NULL AUTO_INCREMENT,
  `codigo_localidade` varchar(50) NOT NULL,
  `nome` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_localidades_atendimento_codigo_localidade` (`codigo_localidade`),
  KEY `ix_localidades_atendimento_id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `localidades_atendimento`
--

LOCK TABLES `localidades_atendimento` WRITE;
/*!40000 ALTER TABLE `localidades_atendimento` DISABLE KEYS */;
INSERT INTO `localidades_atendimento` VALUES (1,'PABA007948','AÇÃO CERTIFICADORA - Salvador'),(2,'PABA009173','AR WA CERTIFICADO DIGITAL'),(3,'PASP001512','A DIGIFORTE - Lapa'),(4,'PASP014323','ACAO CERTIFICADORA - São Jose dos Campos (Vila Industrial)'),(5,'PASP014286','ACAO CERTIFICADORA - São Paulo (Vila Rio Branco)'),(6,'PASP004546','A DIGIFORTE - Itanhaem'),(7,'PASP005711','AR AÇÃO CERTIFICADORA - Tatuapé'),(8,'PASP001513','A DIGIFORTE - Osasco'),(9,'PASP001509','A DIGIFORTE - Santo Amaro'),(10,'PASP001504','AR A DIGIFORTE - Centro'),(11,'PASP001506','A DIGIFORTE - Santana'),(12,'PASP014276','AÇÃO CERTIFICADORA - São Bernardo do Campo'),(13,'PASP013813','AR VIDA DE OURO VALE DO PARAIBA'),(14,'PASP014367','AÇÃO CERTIFICADORA - Cubatão (Vila Santa Rosa)'),(15,'PASP009806','AÇÃO CERTIFICADORA - Guaratingueta (Centro)'),(16,'PASP009824','AÇÃO CERTIFICADORA - Sao Jose do Rio Preto (Centro)'),(17,'PAMA013922','AR INOVAR CONTABILIDADE'),(18,'PASP014343','AÇÃO CERTIFICADORA - São Paulo (Centro II)'),(19,'PASP006310','AR A DIGIFORTE - Central de Verificação'),(20,'PASP014290','ACAO CERTIFICADORA - São Paulo (Vila Verde)'),(21,'PABA009160','AR CONEXAO CERTIFICADORA'),(22,'PAAM009705','AÇÃO CERTIFICADORA - Boca do Acre (Platô do Piquiá)'),(23,'PASP015946','ACAO CERTIFICADORA - Santos (Gonzaga)'),(24,'PASP014355','ACAO CERTIFICADORA - Cotia (Centro)'),(25,'PASP013771','AÇÃO CERTIFICADORA - São Vicente (Jardim Rio Branco)'),(26,'PASP016312','AÇÃO CERTIFICADORA - São Paulo (Vila Gea)'),(27,'PASC009662','AÇÃO CERTIFICADORA - Anita Garibaldi (Centro)'),(28,'PASP014353','ACAO CERTIFICADORA - São Paulo (Saúde)'),(29,'PASP014300','ACAO CERTIFICADORA - Atibaia (Alvinopolis)'),(30,'PASP014277','ACAO CERTIFICADORA - São Paulo (Agua Fria)'),(31,'PAMS015647','AÇÃO CERTIFICADORA - Campo Grande (Amambaí)'),(32,'PASP015631','A DIGIFORTE - São Paulo (Vila Nova Conceição)');
/*!40000 ALTER TABLE `localidades_atendimento` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `hashed_password` varchar(255) NOT NULL,
  `is_active` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_users_username` (`username`),
  UNIQUE KEY `ix_users_email` (`email`),
  KEY `ix_users_id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'lucas.truppel','lucas.truppel@digiforte.com.br','$2b$12$f7mxtnUyGA3rDw93yLszxuPP4/gX/pGxBYWl0omBjBHr0EI1w40f6',1);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-11-05 19:56:17
