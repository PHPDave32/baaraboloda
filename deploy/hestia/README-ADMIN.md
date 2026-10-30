# baaraboloda.crademo.com — activation HTTPS via HestiaCP

À faire UNIQUEMENT après accord de l'administrateur (recharge Nginx à chaud).
L'application tourne déjà sur `127.0.0.1:18080`.

```bash
cd /var/www/david/baaraboloda/hestia
H=/usr/local/hestia/bin

# 0. Choisir l'utilisateur Hestia qui portera le domaine (à confirmer avec l'admin)
sudo $H/v-list-users
U=admin   # remplacer si l'admin indique un autre utilisateur

# 1. Installer le template proxy
sudo cp baaraboloda.tpl baaraboloda.stpl /usr/local/hestia/data/templates/web/nginx/

# 2. Créer le domaine et lui appliquer le template
sudo $H/v-add-web-domain $U baaraboloda.crademo.com 192.168.2.249
sudo $H/v-change-web-domain-proxy-tpl $U baaraboloda.crademo.com baaraboloda

# 3. Certificat Let's Encrypt + redirection HTTPS (renouvellement automatique par Hestia)
sudo $H/v-add-letsencrypt-domain $U baaraboloda.crademo.com
sudo $H/v-add-web-domain-ssl-force $U baaraboloda.crademo.com

# 4. Vérifier
curl -I https://baaraboloda.crademo.com
```

Si l'étape 3 échoue, les ports 80/443 publics ne sont probablement pas redirigés vers
192.168.2.249 : voir avec l'admin (Oumar ou Dicko).
