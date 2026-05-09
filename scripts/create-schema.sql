-- Créer le schéma pour DataPresent
CREATE SCHEMA IF NOT EXISTS datapresent;

-- Donner les permissions nécessaires
GRANT USAGE ON SCHEMA datapresent TO dev;
GRANT ALL ON SCHEMA datapresent TO dev;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA datapresent TO dev;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA datapresent TO dev;