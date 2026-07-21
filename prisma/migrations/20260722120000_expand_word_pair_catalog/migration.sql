-- Expand the production catalog without adding classification metadata to WordPair.
-- The temporary groups below only guarantee that generated pairs stay semantically close;
-- theme information is not stored in the database.
WITH word_groups (group_order, words) AS (
  VALUES
    (1, ARRAY['Citron', 'Orange', 'Pamplemousse', 'Mandarine', 'Clémentine', 'Citron vert', 'Kumquat', 'Cédrat', 'Bergamote', 'Pomelo', 'Yuzu']),
    (2, ARRAY['Fraise', 'Framboise', 'Mûre', 'Myrtille', 'Groseille', 'Cassis', 'Airelle', 'Canneberge', 'Cerise', 'Grenade', 'Baie de goji']),
    (3, ARRAY['Mangue', 'Papaye', 'Ananas', 'Fruit de la passion', 'Goyave', 'Litchi', 'Noix de coco', 'Carambole', 'Pitaya', 'Kaki', 'Banane']),
    (4, ARRAY['Pomme', 'Poire', 'Pêche', 'Abricot', 'Prune', 'Nectarine', 'Coing', 'Mirabelle', 'Figue', 'Raisin', 'Reine-claude']),
    (5, ARRAY['Carotte', 'Navet', 'Radis', 'Betterave', 'Panais', 'Topinambour', 'Rutabaga', 'Patate douce', 'Manioc', 'Céleri-rave', 'Pomme de terre']),
    (6, ARRAY['Laitue', 'Épinard', 'Roquette', 'Mâche', 'Chou kale', 'Blette', 'Endive', 'Cresson', 'Chicorée', 'Oseille', 'Feuille de chou']),
    (7, ARRAY['Courgette', 'Citrouille', 'Potiron', 'Concombre', 'Melon', 'Pastèque', 'Pâtisson', 'Butternut', 'Courge spaghetti', 'Cornichon', 'Potimarron']),
    (8, ARRAY['Lentille', 'Pois chiche', 'Haricot rouge', 'Haricot blanc', 'Pois cassé', 'Fève', 'Soja', 'Lupin', 'Flageolet', 'Petit pois', 'Haricot noir']),
    (9, ARRAY['Basilic', 'Persil', 'Coriandre', 'Ciboulette', 'Menthe', 'Thym', 'Romarin', 'Estragon', 'Aneth', 'Sauge', 'Laurier']),
    (10, ARRAY['Cannelle', 'Cumin', 'Curcuma', 'Paprika', 'Gingembre', 'Muscade', 'Safran', 'Cardamome', 'Coriandre moulue', 'Poivre', 'Clou de girofle']),
    (11, ARRAY['Éclair', 'Religieuse', 'Mille-feuille', 'Paris-Brest', 'Opéra', 'Macaron', 'Madeleine', 'Financier', 'Canelé', 'Tartelette', 'Profiterole']),
    (12, ARRAY['Croissant', 'Pain au chocolat', 'Brioche', 'Pain aux raisins', 'Chausson aux pommes', 'Baguette', 'Pain de campagne', 'Fougasse', 'Bretzel', 'Beignet', 'Muffin']),
    (13, ARRAY['Camembert', 'Brie', 'Comté', 'Roquefort', 'Reblochon', 'Chèvre', 'Morbier', 'Cantal', 'Emmental', 'Munster', 'Saint-Nectaire']),
    (14, ARRAY['Mayonnaise', 'Ketchup', 'Moutarde', 'Pesto', 'Sauce tomate', 'Béchamel', 'Vinaigrette', 'Aïoli', 'Sauce barbecue', 'Tapenade', 'Guacamole']),
    (15, ARRAY['Café', 'Thé', 'Chocolat chaud', 'Cappuccino', 'Espresso', 'Latte', 'Tisane', 'Matcha', 'Chicorée', 'Infusion', 'Café frappé']),
    (16, ARRAY['Limonade', 'Cola', 'Tonic', 'Jus de pomme', 'Jus de raisin', 'Jus de tomate', 'Thé glacé', 'Eau gazeuse', 'Smoothie', 'Milk-shake', 'Sirop à eau']),
    (17, ARRAY['Mojito', 'Margarita', 'Spritz', 'Piña colada', 'Daiquiri', 'Bloody Mary', 'Moscow mule', 'Caïpirinha', 'Cosmopolitan', 'Punch', 'Sangria']),
    (18, ARRAY['Spaghetti', 'Tagliatelle', 'Penne', 'Fusilli', 'Lasagne', 'Ravioli', 'Tortellini', 'Macaroni', 'Linguine', 'Gnocchi', 'Cannelloni']),
    (19, ARRAY['Riz', 'Blé', 'Orge', 'Avoine', 'Seigle', 'Maïs', 'Quinoa', 'Boulgour', 'Millet', 'Sarrasin', 'Épeautre']),
    (20, ARRAY['Glace', 'Sorbet', 'Granité', 'Esquimau', 'Coupe glacée', 'Yaourt glacé', 'Crème glacée', 'Milk-shake glacé', 'Affogato', 'Vacherin', 'Bûche glacée']),
    (21, ARRAY['Lion', 'Tigre', 'Léopard', 'Guépard', 'Jaguar', 'Puma', 'Lynx', 'Panthère', 'Ocelot', 'Caracal', 'Serval']),
    (22, ARRAY['Loup', 'Renard', 'Chacal', 'Coyote', 'Dingo', 'Fennec', 'Lycaon', 'Chien viverrin', 'Loup arctique', 'Renard polaire', 'Renard roux']),
    (23, ARRAY['Vache', 'Mouton', 'Chèvre', 'Cochon', 'Cheval', 'Âne', 'Poule', 'Canard', 'Oie', 'Dinde', 'Lapin']),
    (24, ARRAY['Mouette', 'Goéland', 'Albatros', 'Pélican', 'Cormoran', 'Macareux', 'Sterne', 'Fou de Bassan', 'Frégate', 'Pingouin', 'Pétrel']),
    (25, ARRAY['Aigle', 'Faucon', 'Buse', 'Vautour', 'Épervier', 'Milan', 'Balbuzard', 'Condor', 'Gypaète', 'Crécerelle', 'Autour']),
    (26, ARRAY['Moineau', 'Rouge-gorge', 'Mésange', 'Merle', 'Pinson', 'Chardonneret', 'Hirondelle', 'Tourterelle', 'Étourneau', 'Verdier', 'Bergeronnette']),
    (27, ARRAY['Saumon', 'Thon', 'Sardine', 'Maquereau', 'Cabillaud', 'Truite', 'Dorade', 'Bar', 'Sole', 'Hareng', 'Anchois']),
    (28, ARRAY['Requin blanc', 'Requin-marteau', 'Requin-tigre', 'Raie manta', 'Raie pastenague', 'Poisson-scie', 'Requin-baleine', 'Roussette', 'Mako', 'Requin pèlerin', 'Raie électrique']),
    (29, ARRAY['Dauphin', 'Baleine', 'Orque', 'Marsouin', 'Narval', 'Béluga', 'Cachalot', 'Lamantin', 'Dugong', 'Phoque', 'Otarie']),
    (30, ARRAY['Abeille', 'Guêpe', 'Frelon', 'Fourmi', 'Coccinelle', 'Papillon', 'Libellule', 'Sauterelle', 'Criquet', 'Mante religieuse', 'Scarabée']),
    (31, ARRAY['Crocodile', 'Alligator', 'Iguane', 'Caméléon', 'Gecko', 'Varan', 'Python', 'Cobra', 'Vipère', 'Tortue', 'Lézard']),
    (32, ARRAY['Grenouille', 'Crapaud', 'Salamandre', 'Triton', 'Axolotl', 'Rainette', 'Dendrobate', 'Protée', 'Sonneur', 'Pélobate', 'Cécilie']),
    (33, ARRAY['Souris', 'Rat', 'Hamster', 'Gerbille', 'Cochon d’Inde', 'Chinchilla', 'Castor', 'Écureuil', 'Marmotte', 'Porc-épic', 'Campagnol']),
    (34, ARRAY['Chimpanzé', 'Gorille', 'Orang-outan', 'Bonobo', 'Gibbon', 'Babouin', 'Macaque', 'Lémurien', 'Ouistiti', 'Capucin', 'Mandrill']),
    (35, ARRAY['Éléphant', 'Girafe', 'Zèbre', 'Rhinocéros', 'Hippopotame', 'Gazelle', 'Antilope', 'Gnou', 'Buffle', 'Okapi', 'Phacochère']),
    (36, ARRAY['Cerf', 'Chevreuil', 'Sanglier', 'Blaireau', 'Hérisson', 'Belette', 'Martre', 'Loutre', 'Raton laveur', 'Ours', 'Élan']),
    (37, ARRAY['Tyrannosaure', 'Tricératops', 'Vélociraptor', 'Diplodocus', 'Stégosaure', 'Brachiosaure', 'Ankylosaure', 'Spinosaure', 'Allosaure', 'Iguanodon', 'Parasaurolophus']),
    (38, ARRAY['Crabe', 'Homard', 'Langouste', 'Crevette', 'Écrevisse', 'Bernard-l’ermite', 'Araignée de mer', 'Tourteau', 'Langoustine', 'Cigale de mer', 'Krill']),
    (39, ARRAY['Labrador', 'Golden retriever', 'Berger allemand', 'Husky', 'Beagle', 'Caniche', 'Bouledogue', 'Dalmatien', 'Teckel', 'Chihuahua', 'Border collie']),
    (40, ARRAY['Siamois', 'Persan', 'Maine coon', 'Bengal', 'Chartreux', 'Sphynx', 'Sacré de Birmanie', 'British shorthair', 'Ragdoll', 'Abyssin', 'Norvégien']),
    (41, ARRAY['Violon', 'Alto', 'Violoncelle', 'Contrebasse', 'Guitare', 'Harpe', 'Mandoline', 'Ukulélé', 'Banjo', 'Luth', 'Cithare']),
    (42, ARRAY['Piano', 'Orgue', 'Clavecin', 'Accordéon', 'Synthétiseur', 'Harmonium', 'Clavier électronique', 'Mélodica', 'Célesta', 'Épinette', 'Piano électrique']),
    (43, ARRAY['Flûte', 'Clarinette', 'Hautbois', 'Basson', 'Saxophone', 'Piccolo', 'Flûte de pan', 'Harmonica', 'Ocarina', 'Cornemuse', 'Basson anglais']),
    (44, ARRAY['Trompette', 'Trombone', 'Tuba', 'Cor', 'Bugle', 'Cornet', 'Euphonium', 'Sousaphone', 'Hélicon', 'Saxhorn', 'Clairon']),
    (45, ARRAY['Batterie', 'Tambour', 'Timbale', 'Xylophone', 'Marimba', 'Cymbale', 'Triangle', 'Tambourin', 'Gong', 'Bongo', 'Djembé']),
    (46, ARRAY['Rock', 'Pop', 'Jazz', 'Blues', 'Reggae', 'Rap', 'Soul', 'Funk', 'Disco', 'Techno', 'Country']),
    (47, ARRAY['Valse', 'Tango', 'Salsa', 'Samba', 'Rumba', 'Cha-cha-cha', 'Flamenco', 'Ballet', 'Hip-hop', 'Breakdance', 'Rock acrobatique']),
    (48, ARRAY['Soprano', 'Alto', 'Ténor', 'Baryton', 'Basse', 'Chorale', 'Soliste', 'Duo', 'Trio', 'Quatuor', 'Chœur']),
    (49, ARRAY['Comédie', 'Drame', 'Thriller', 'Horreur', 'Science-fiction', 'Fantastique', 'Western', 'Policier', 'Animation', 'Documentaire', 'Aventure']),
    (50, ARRAY['Clown', 'Acrobate', 'Jongleur', 'Trapéziste', 'Magicien', 'Contorsionniste', 'Funambule', 'Mime', 'Dompteur', 'Ventriloque', 'Cracheur de feu']),
    (51, ARRAY['Aquarelle', 'Gouache', 'Peinture à huile', 'Acrylique', 'Fusain', 'Pastel', 'Encre', 'Crayon', 'Craie', 'Feutre', 'Bombe de peinture']),
    (52, ARRAY['Rouge', 'Bleu', 'Vert', 'Jaune', 'Orange', 'Violet', 'Rose', 'Marron', 'Turquoise', 'Beige', 'Gris']),
    (53, ARRAY['Cercle', 'Carré', 'Triangle', 'Rectangle', 'Losange', 'Ovale', 'Pentagone', 'Hexagone', 'Trapèze', 'Étoile', 'Spirale']),
    (54, ARRAY['Château', 'Palais', 'Cathédrale', 'Temple', 'Mosquée', 'Gratte-ciel', 'Phare', 'Moulin', 'Tour', 'Forteresse', 'Monastère']),
    (55, ARRAY['Cuisine', 'Salon', 'Chambre', 'Salle de bains', 'Bureau', 'Grenier', 'Cave', 'Garage', 'Buanderie', 'Véranda', 'Entrée']),
    (56, ARRAY['Canapé', 'Fauteuil', 'Chaise', 'Table', 'Armoire', 'Commode', 'Bibliothèque', 'Bureau', 'Tabouret', 'Lit', 'Étagère']),
    (57, ARRAY['Réfrigérateur', 'Four', 'Micro-ondes', 'Grille-pain', 'Bouilloire', 'Mixeur', 'Cafetière', 'Lave-vaisselle', 'Robot de cuisine', 'Friteuse', 'Plaque de cuisson']),
    (58, ARRAY['Marteau', 'Tournevis', 'Pince', 'Scie', 'Perceuse', 'Clé anglaise', 'Niveau', 'Mètre ruban', 'Étau', 'Lime', 'Ciseau à bois']),
    (59, ARRAY['Vis', 'Clou', 'Boulon', 'Écrou', 'Rondelle', 'Cheville', 'Rivet', 'Agrafe', 'Goupille', 'Crochet', 'Piton']),
    (60, ARRAY['T-shirt', 'Chemise', 'Pull', 'Sweat', 'Veste', 'Manteau', 'Blouson', 'Débardeur', 'Polo', 'Cardigan', 'Tunique']),
    (61, ARRAY['Pantalon', 'Jean', 'Short', 'Jupe', 'Robe', 'Legging', 'Salopette', 'Bermuda', 'Jogging', 'Kilt', 'Combinaison']),
    (62, ARRAY['Basket', 'Botte', 'Sandale', 'Mocassin', 'Escarpin', 'Bottine', 'Tong', 'Chausson', 'Espadrille', 'Derby', 'Sabot']),
    (63, ARRAY['Chapeau', 'Casquette', 'Bonnet', 'Écharpe', 'Ceinture', 'Gant', 'Cravate', 'Nœud papillon', 'Sac à main', 'Lunettes', 'Parapluie']),
    (64, ARRAY['Bague', 'Collier', 'Bracelet', 'Boucle d’oreille', 'Broche', 'Pendentif', 'Diadème', 'Chevalière', 'Chaîne', 'Médaillon', 'Montre']),
    (65, ARRAY['Rouge à lèvres', 'Mascara', 'Fond de teint', 'Fard à paupières', 'Vernis', 'Eyeliner', 'Poudre', 'Blush', 'Anticernes', 'Gloss', 'Parfum']),
    (66, ARRAY['Shampoing', 'Après-shampoing', 'Brosse', 'Peigne', 'Sèche-cheveux', 'Lisseur', 'Boucleur', 'Élastique', 'Barrette', 'Laque', 'Tondeuse']),
    (67, ARRAY['Mathématiques', 'Français', 'Histoire', 'Géographie', 'Physique', 'Chimie', 'Biologie', 'Philosophie', 'Anglais', 'Musique', 'Arts plastiques']),
    (68, ARRAY['Cahier', 'Classeur', 'Crayon', 'Stylo', 'Gomme', 'Règle', 'Compas', 'Équerre', 'Rapporteur', 'Surligneur', 'Taille-crayon']),
    (69, ARRAY['Agrafeuse', 'Trombone', 'Enveloppe', 'Tampon', 'Calculatrice', 'Imprimante', 'Photocopieuse', 'Bloc-notes', 'Pochette', 'Perforatrice', 'Corbeille à papier']),
    (70, ARRAY['Médecin', 'Infirmier', 'Chirurgien', 'Dentiste', 'Pharmacien', 'Kinésithérapeute', 'Vétérinaire', 'Sage-femme', 'Radiologue', 'Psychologue', 'Ambulancier']),
    (71, ARRAY['Maçon', 'Charpentier', 'Plombier', 'Électricien', 'Peintre', 'Couvreur', 'Carreleur', 'Menuisier', 'Architecte', 'Grutier', 'Terrassier']),
    (72, ARRAY['Acteur', 'Réalisateur', 'Photographe', 'Écrivain', 'Illustrateur', 'Musicien', 'Danseur', 'Sculpteur', 'Styliste', 'Décorateur', 'Graphiste']),
    (73, ARRAY['Policier', 'Gendarme', 'Avocat', 'Juge', 'Notaire', 'Détective', 'Douanier', 'Pompier', 'Gardien', 'Procureur', 'Huissier']),
    (74, ARRAY['Voiture', 'Bus', 'Camion', 'Tramway', 'Métro', 'Train', 'Taxi', 'Autocar', 'Fourgonnette', 'Limousine', 'Trolleybus']),
    (75, ARRAY['Berline', 'Break', 'Coupé', 'Cabriolet', 'Monospace', 'Citadine', 'Pick-up', 'Fourgon', 'Roadster', 'Limousine', 'Tout-terrain']),
    (76, ARRAY['Vélo', 'Moto', 'Scooter', 'Trottinette', 'Mobylette', 'VTT', 'BMX', 'Tandem', 'Monocycle', 'Cyclomoteur', 'Vélo électrique']),
    (77, ARRAY['Voilier', 'Yacht', 'Ferry', 'Paquebot', 'Péniche', 'Canoë', 'Kayak', 'Catamaran', 'Sous-marin', 'Chalutier', 'Vedette']),
    (78, ARRAY['Avion', 'Hélicoptère', 'Planeur', 'Montgolfière', 'Dirigeable', 'Hydravion', 'Jet', 'Biplan', 'ULM', 'Drone', 'Parapente']),
    (79, ARRAY['TGV', 'TER', 'Métro', 'Tramway', 'Locomotive', 'Wagon', 'Funiculaire', 'Monorail', 'Train de nuit', 'Train de marchandises', 'Autorail']),
    (80, ARRAY['Autoroute', 'Nationale', 'Départementale', 'Rue', 'Avenue', 'Boulevard', 'Impasse', 'Ruelle', 'Chemin', 'Rond-point', 'Carrefour']),
    (81, ARRAY['But', 'Penalty', 'Corner', 'Hors-jeu', 'Carton rouge', 'Coup franc', 'Gardien', 'Attaquant', 'Défenseur', 'Arbitre', 'Stade']),
    (82, ARRAY['Panier', 'Dribble', 'Rebond', 'Dunk', 'Lancer franc', 'Pivot', 'Meneur', 'Ailier', 'Raquette', 'Faute', 'Prolongation']),
    (83, ARRAY['Service', 'Revers', 'Coup droit', 'Volée', 'Smash', 'Ace', 'Filet', 'Raquette', 'Balle de match', 'Tie-break', 'Arbitre de chaise']),
    (84, ARRAY['Crawl', 'Brasse', 'Papillon', 'Dos crawlé', 'Plongeon', 'Relais', 'Bassin', 'Bonnet de bain', 'Palme', 'Tuba', 'Maître-nageur']),
    (85, ARRAY['Ski alpin', 'Ski de fond', 'Snowboard', 'Biathlon', 'Bobsleigh', 'Luge', 'Patinage', 'Curling', 'Hockey sur glace', 'Saut à ski', 'Slalom']),
    (86, ARRAY['Sprint', 'Marathon', 'Relais', 'Haies', 'Saut en hauteur', 'Saut en longueur', 'Perche', 'Javelot', 'Disque', 'Poids', 'Décathlon']),
    (87, ARRAY['Boxe', 'Judo', 'Karaté', 'Taekwondo', 'Escrime', 'Lutte', 'Kick-boxing', 'Aïkido', 'Jiu-jitsu', 'Muay-thaï', 'Sumo']),
    (88, ARRAY['Badminton', 'Squash', 'Tennis de table', 'Padel', 'Pelote basque', 'Racquetball', 'Pickleball', 'Speedminton', 'Jeu de paume', 'Tennis', 'Beach tennis']),
    (89, ARRAY['Échecs', 'Dames', 'Backgammon', 'Go', 'Scrabble', 'Monopoly', 'Cluedo', 'Risk', 'Dominos', 'Puissance 4', 'Trivial Pursuit']),
    (90, ARRAY['Poker', 'Belote', 'Tarot', 'Bridge', 'Rami', 'Bataille', 'Uno', 'Solitaire', 'Blackjack', 'Président', 'Sept familles']),
    (91, ARRAY['Jeu de rôle', 'Jeu de stratégie', 'Jeu de course', 'Jeu de combat', 'Jeu de plateforme', 'Jeu de réflexion', 'Jeu de sport', 'Jeu de tir', 'Jeu de rythme', 'Jeu de survie', 'Simulation']),
    (92, ARRAY['Processeur', 'Carte graphique', 'Mémoire vive', 'Disque dur', 'Carte mère', 'Alimentation', 'Ventilateur', 'Écran', 'Clavier', 'Souris', 'Webcam']),
    (93, ARRAY['Navigateur', 'Moteur de recherche', 'Site web', 'Application', 'Serveur', 'Base de données', 'Code source', 'Algorithme', 'Logiciel', 'Réseau', 'Pare-feu']),
    (94, ARRAY['Smartphone', 'Tablette', 'Chargeur', 'Écouteur', 'Coque', 'Carte SIM', 'Batterie', 'Écran tactile', 'Appareil photo', 'Microphone', 'Haut-parleur']),
    (95, ARRAY['Étoile', 'Planète', 'Lune', 'Comète', 'Astéroïde', 'Galaxie', 'Nébuleuse', 'Trou noir', 'Supernova', 'Constellation', 'Météorite']),
    (96, ARRAY['Fusée', 'Satellite', 'Navette spatiale', 'Sonde', 'Rover', 'Station spatiale', 'Astronaute', 'Capsule', 'Module lunaire', 'Télescope spatial', 'Combinaison spatiale']),
    (97, ARRAY['Pluie', 'Neige', 'Grêle', 'Brouillard', 'Orage', 'Tempête', 'Ouragan', 'Tornade', 'Canicule', 'Gel', 'Arc-en-ciel']),
    (98, ARRAY['Montagne', 'Colline', 'Falaise', 'Vallée', 'Plateau', 'Canyon', 'Volcan', 'Glacier', 'Sommet', 'Crête', 'Gorge']),
    (99, ARRAY['Océan', 'Mer', 'Lac', 'Rivière', 'Fleuve', 'Étang', 'Cascade', 'Lagune', 'Marais', 'Ruisseau', 'Baie']),
    (100, ARRAY['Chêne', 'Hêtre', 'Sapin', 'Érable', 'Bouleau', 'Pin', 'Saule', 'Peuplier', 'Châtaignier', 'Noisetier', 'Frêne'])
),
raw_candidates AS (
  SELECT
    word_groups.group_order,
    left_word.position AS left_position,
    right_word.position AS right_position,
    left_word.word AS civilian_word,
    right_word.word AS impostor_word
  FROM word_groups
  CROSS JOIN LATERAL unnest(word_groups.words) WITH ORDINALITY AS left_word(word, position)
  CROSS JOIN LATERAL unnest(word_groups.words) WITH ORDINALITY AS right_word(word, position)
  WHERE left_word.position < right_word.position
),
normalized_candidates AS (
  SELECT
    raw_candidates.*,
    trim(regexp_replace(
      translate(lower(replace(replace(civilian_word, 'œ', 'oe'), 'æ', 'ae')),
        'àáâäãåçèéêëìíîïñòóôöõùúûüýÿ',
        'aaaaaaceeeeiiiinooooouuuuyy'),
      '[^a-z0-9]+', ' ', 'g'
    )) AS normalized_civilian_word,
    trim(regexp_replace(
      translate(lower(replace(replace(impostor_word, 'œ', 'oe'), 'æ', 'ae')),
        'àáâäãåçèéêëìíîïñòóôöõùúûüýÿ',
        'aaaaaaceeeeiiiinooooouuuuyy'),
      '[^a-z0-9]+', ' ', 'g'
    )) AS normalized_impostor_word
  FROM raw_candidates
),
unique_candidates AS (
  SELECT DISTINCT ON (
    LEAST(normalized_civilian_word, normalized_impostor_word),
    GREATEST(normalized_civilian_word, normalized_impostor_word)
  )
    group_order,
    left_position,
    right_position,
    civilian_word,
    impostor_word,
    normalized_civilian_word,
    normalized_impostor_word
  FROM normalized_candidates
  WHERE normalized_civilian_word <> normalized_impostor_word
  ORDER BY
    LEAST(normalized_civilian_word, normalized_impostor_word),
    GREATEST(normalized_civilian_word, normalized_impostor_word),
    group_order,
    left_position,
    right_position
),
eligible_candidates AS (
  SELECT unique_candidates.*
  FROM unique_candidates
  WHERE NOT EXISTS (
    SELECT 1
    FROM "WordPair"
    WHERE
      ("normalizedCivilianWord" = unique_candidates.normalized_civilian_word
        AND "normalizedImpostorWord" = unique_candidates.normalized_impostor_word)
      OR
      ("normalizedCivilianWord" = unique_candidates.normalized_impostor_word
        AND "normalizedImpostorWord" = unique_candidates.normalized_civilian_word)
  )
),
ranked_candidates AS (
  SELECT
    eligible_candidates.*,
    row_number() OVER (
      ORDER BY group_order, left_position, right_position,
        normalized_civilian_word, normalized_impostor_word
    ) AS catalog_position
  FROM eligible_candidates
),
active_catalog AS (
  SELECT count(*) AS active_count
  FROM "WordPair"
  WHERE "isActive" = true
)
INSERT INTO "WordPair" (
  "id",
  "civilianWord",
  "impostorWord",
  "normalizedCivilianWord",
  "normalizedImpostorWord",
  "isActive",
  "createdAt",
  "updatedAt"
)
SELECT
  'word_pair_catalog_' || md5(
    LEAST(normalized_civilian_word, normalized_impostor_word) || ':' ||
    GREATEST(normalized_civilian_word, normalized_impostor_word)
  ),
  civilian_word,
  impostor_word,
  normalized_civilian_word,
  normalized_impostor_word,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM ranked_candidates
CROSS JOIN active_catalog
WHERE catalog_position <= GREATEST(5000 - active_catalog.active_count, 0)
ON CONFLICT DO NOTHING;

DO $$
BEGIN
  IF (SELECT count(*) FROM "WordPair" WHERE "isActive" = true) < 5000 THEN
    RAISE EXCEPTION 'The active word-pair catalog could not be expanded to 5000 entries.';
  END IF;
END
$$;
