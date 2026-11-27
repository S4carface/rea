<?php
// Copy to lm-config.php ONE FOLDER ABOVE public_html on the web host. Never upload it inside the website folder.
return [
  'enabled' => false,                      // true after a test request arrives
  'to'      => 'care.lmtire@gmail.com',    // customer service inbox (confirmed by the owner)
  'from'    => '',                         // an address on the website's own domain, e.g. website@YOUR-DOMAIN (needed so Gmail accepts it)
  'origin'  => '',                         // e.g. https://www.YOUR-DOMAIN
];
