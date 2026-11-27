# ONE place for L&M Tire business facts. The build script (tools/build_site.py) copies these into
# every page, the hours file, Google data, sitemap and the policies page, in English, Portuguese and Spanish.
# Change a fact here, run the build, and every page and language updates together.

SITE = {
    # Final domain: not confirmed yet. Put it here like 'https://www.example.com' and rebuild.
    'domain': '',
    # Privacy-friendly analytics. Leave provider empty for none. Supported: 'plausible', 'umami', 'goatcounter'.
    'analytics': {'provider': '', 'id': '', 'src': ''},
    # Google Search Console: paste only the content="..." code from the HTML-tag verification method. Empty = no tag.
    'search_console': '',
}

BUSINESS = {
    'name': 'L&M Tire Auto Repair',
    'street': '598 West Boylston Street', 'city': 'Worcester', 'region': 'MA', 'zip': '01606', 'country': 'US',
    'geo': (42.3119935, -71.7974734),
    'founded': '2013',
    'phone': {'shop': '+15088533322', 'text': '+13048066047', 'pt': '+17742889675'},
    'phone_label': {'shop': '508-853-3322', 'text': '304-806-6047', 'pt': '774-288-9675'},
    'payment': ['Cash', 'Credit Card'],
    'google_profile_url': 'https://g.page/r/CTVdw0UmvaHLEBM',
    'google_review_url': 'https://g.page/r/CTVdw0UmvaHLEBM/review',
    'google_maps_url': 'https://www.google.com/maps/search/?api=1&query=L%26M+Tire+Auto+Repair+598+West+Boylston+Street+Worcester+MA+01606',
    # Google rating: leave None until the shop confirms the numbers from the Google Business Profile.
    'google_rating': None, 'google_review_count': None,
    # Acima merchant application link: leave empty until the shop sends it (a Contact Us button shows instead).
    'acima_url': '',
}

# Hours. Times are Worcester time. Day 0 = Sunday. Missing day = closed.
HOURS = {
    'weekly': {1: ('08:00', '18:00'), 2: ('08:00', '18:00'), 3: ('08:00', '18:00'), 4: ('08:00', '18:00'), 5: ('08:00', '18:00'), 6: ('08:00', '12:00')},
    # Holiday schedule: 'YYYY-MM-DD': 'closed' or ('08:00', '12:00'). Waiting for the shop to confirm.
    'holidays': {},
    'holiday_names': {},
}

# Real shop photos. Add files to assets/photos/ and list them here. The photo section stays hidden until one exists.
# Each: (file, {'en': alt, 'pt': alt, 'es': alt}, category)
PHOTOS = []
PHOTO_SLOTS = ['exterior', 'bays', 'tires', 'alignment', 'equipment', 'team']

DEPOSIT = {
    'en': {
        'title': 'Appointments and deposit',
        'short': 'Some mechanical service appointments need a $60 deposit, credited toward your service. Routine walk-in tire services usually don\'t need one.',
        'confirm': 'Your appointment is not booked until our staff texts or calls to confirm the time.',
        'items': [
            'A $60 deposit is required for designated mechanical service appointments.',
            'The deposit is credited toward your service.',
            'Routine walk-in tire services generally do not require a deposit.',
            'You may reschedule once with at least 24 hours\' notice.',
            'Late cancellations and no-shows may result in losing the deposit. We tell you this when you book.',
            'Special-order tires must be paid in full before we order them.',
            'Appointment requests are not confirmed until our staff confirms availability.',
        ],
    },
    'pt': {
        'title': 'Agendamento e sinal',
        'short': 'Alguns serviços mecânicos com hora marcada pedem um sinal de $60, descontado do valor do serviço. Serviços de pneu sem hora marcada normalmente não pedem sinal.',
        'confirm': 'Seu horário só fica marcado quando nossa equipe confirma por mensagem ou telefone.',
        'items': [
            'É cobrado um sinal de $60 para os serviços mecânicos indicados com hora marcada.',
            'O sinal é descontado do valor do serviço.',
            'Serviços de pneu de rotina, sem hora marcada, geralmente não pedem sinal.',
            'Você pode remarcar uma vez, com pelo menos 24 horas de antecedência.',
            'Cancelamento em cima da hora ou falta podem fazer você perder o sinal. Avisamos isso na hora de agendar.',
            'Pneus por encomenda precisam ser pagos por completo antes do pedido.',
            'O pedido de horário só é confirmado quando nossa equipe confirma a disponibilidade.',
        ],
    },
    'es': {
        'title': 'Citas y depósito',
        'short': 'Algunas citas de servicio mecánico requieren un depósito de $60, que se descuenta de su servicio. Los servicios de llantas sin cita normalmente no lo requieren.',
        'confirm': 'Su cita no queda reservada hasta que nuestro personal le confirme la hora por texto o llamada.',
        'items': [
            'Se requiere un depósito de $60 para las citas de servicio mecánico indicadas.',
            'El depósito se descuenta de su servicio.',
            'Los servicios de llantas de rutina sin cita generalmente no requieren depósito.',
            'Puede cambiar la cita una vez, con al menos 24 horas de aviso.',
            'Las cancelaciones tarde y las faltas pueden hacer que pierda el depósito. Se lo decimos al reservar.',
            'Las llantas por pedido especial se pagan completas antes de pedirlas.',
            'Las solicitudes de cita no quedan confirmadas hasta que nuestro personal confirme la disponibilidad.',
        ],
    },
}

# Policies page categories. Wording follows the shop's list; "subject to applicable law" kept where the shop wrote it.
POLICIES = {
    'en': {
        'title': 'Shop policies', 'h1': 'Shop policies',
        'desc': 'Appointments, deposits, payment, tires, parts, repairs and pickup at L&M Tire Auto Repair, Worcester, MA.',
        'intro': 'Plain answers about how we work. Tap a topic to open it. Questions? Call 508-853-3322.',
        'law': 'Nothing on this page limits your rights under Massachusetts or federal consumer protection law.',
        'cats': [
            ('Payment', ['We accept cash and credit cards.', 'Full payment is required before vehicle pickup.']),
            ('Tires', ['Tire disposal is $10 per tire.', 'Special-order tires must be paid in full before we order them.', 'Installed tires are generally final sale, subject to applicable law.', 'AWD and 4WD vehicles may need matching tires to protect the drivetrain.', 'After tire or wheel service, please follow our wheel lug nut retorque instructions.']),
            ('Repairs and diagnostics', ['Diagnostic services are charged separately from repairs.', 'We will not do additional repairs without your authorization.']),
            ('Customer-supplied parts and tires', ['We accept customer-supplied parts and tires at our discretion.', 'We do not provide a product warranty on customer-supplied parts.']),
            ('Returns', ['Eligible product returns may be subject to a 20% restocking fee.', 'Installed tires are generally final sale, subject to applicable law.']),
            ('Vehicle pickup and storage', ['Full payment is required before vehicle pickup.', 'Vehicle storage is $35 per day after 24 hours following documented pickup notification, subject to applicable law.']),
        ],
    },
    'pt': {
        'title': 'Políticas da oficina', 'h1': 'Políticas da oficina',
        'desc': 'Agendamento, sinal, pagamento, pneus, peças, consertos e retirada na L&M Tire Auto Repair, Worcester, MA.',
        'intro': 'Respostas claras sobre como trabalhamos. Toque num tema para abrir. Dúvidas? Ligue para 508-853-3322 ou mande mensagem em português para 774-288-9675.',
        'law': 'Nada nesta página limita os seus direitos pelas leis de proteção ao consumidor de Massachusetts ou federais.',
        'cats': [
            ('Pagamento', ['Aceitamos dinheiro e cartão de crédito.', 'O pagamento completo é feito antes de retirar o carro.']),
            ('Pneus', ['O descarte de pneu custa $10 por pneu.', 'Pneus por encomenda precisam ser pagos por completo antes do pedido.', 'Pneus instalados geralmente não têm devolução, conforme a lei aplicável.', 'Carros com tração AWD ou 4x4 podem precisar de pneus iguais para proteger o sistema de tração.', 'Depois do serviço de pneu ou roda, siga nossas instruções para reapertar as porcas da roda.']),
            ('Consertos e diagnóstico', ['O diagnóstico é cobrado à parte do conserto.', 'Não fazemos consertos extras sem a sua autorização.']),
            ('Peças e pneus trazidos pelo cliente', ['Aceitamos peças e pneus trazidos pelo cliente a nosso critério.', 'Não damos garantia de produto em peças trazidas pelo cliente.']),
            ('Devoluções', ['Devoluções de produtos aceitos podem ter taxa de reposição de 20%.', 'Pneus instalados geralmente não têm devolução, conforme a lei aplicável.']),
            ('Retirada e guarda do carro', ['O pagamento completo é feito antes de retirar o carro.', 'A guarda do carro custa $35 por dia depois de 24 horas do aviso documentado de retirada, conforme a lei aplicável.']),
        ],
    },
    'es': {
        'title': 'Políticas del taller', 'h1': 'Políticas del taller',
        'desc': 'Citas, depósitos, pagos, llantas, piezas, reparaciones y recogida en L&M Tire Auto Repair, Worcester, MA.',
        'intro': 'Respuestas claras sobre cómo trabajamos. Toque un tema para abrirlo. ¿Preguntas? Llame al 508-853-3322 o mande texto al 304-806-6047.',
        'law': 'Nada en esta página limita sus derechos bajo las leyes de protección al consumidor de Massachusetts o federales.',
        'cats': [
            ('Pagos', ['Aceptamos efectivo y tarjeta de crédito.', 'El pago completo se hace antes de recoger el vehículo.']),
            ('Llantas', ['El desecho de llantas cuesta $10 por llanta.', 'Las llantas por pedido especial se pagan completas antes de pedirlas.', 'Las llantas instaladas generalmente son venta final, según la ley aplicable.', 'Los vehículos AWD y 4x4 pueden necesitar llantas iguales para proteger el sistema de tracción.', 'Después de un servicio de llantas o ruedas, siga nuestras instrucciones para volver a apretar las tuercas.']),
            ('Reparaciones y diagnóstico', ['El diagnóstico se cobra aparte de las reparaciones.', 'No hacemos reparaciones adicionales sin su autorización.']),
            ('Piezas y llantas que trae el cliente', ['Aceptamos piezas y llantas que trae el cliente a nuestro criterio.', 'No damos garantía de producto en piezas que trae el cliente.']),
            ('Devoluciones', ['Las devoluciones de productos elegibles pueden tener un cargo de reposición del 20%.', 'Las llantas instaladas generalmente son venta final, según la ley aplicable.']),
            ('Recogida y almacenaje del vehículo', ['El pago completo se hace antes de recoger el vehículo.', 'El almacenaje cuesta $35 por día después de 24 horas del aviso documentado para recoger, según la ley aplicable.']),
        ],
    },
}

ACIMA = {
    'en': {
        'kicker': 'Lease-to-own', 'title': 'Lease-to-own with Acima.',
        'body': 'We offer Acima lease-to-own options for eligible parts only. Labor is not included. Ask us which parts qualify.',
        'points': ['For eligible parts only, not labor', 'Approval is not guaranteed', 'Acima\'s terms apply'],
        'cta': 'Contact us about Acima', 'cta_apply': 'Apply with Acima',
        'sms': 'Hi L&M Tire, I have a question about Acima lease-to-own for parts.',
    },
    'pt': {
        'kicker': 'Leasing com opção de compra', 'title': 'Leasing com opção de compra pela Acima.',
        'body': 'Oferecemos opções de leasing com opção de compra da Acima somente para peças elegíveis. A mão de obra não está incluída. Pergunte quais peças se qualificam.',
        'points': ['Só para peças elegíveis, não mão de obra', 'A aprovação não é garantida', 'Valem os termos da Acima'],
        'cta': 'Fale conosco sobre a Acima', 'cta_apply': 'Fazer o pedido na Acima',
        'sms': 'Olá L&M Tire, tenho uma dúvida sobre o leasing da Acima para peças.',
    },
    'es': {
        'kicker': 'Arrendamiento con opción a compra', 'title': 'Arrendamiento con opción a compra con Acima.',
        'body': 'Ofrecemos opciones de arrendamiento con opción a compra de Acima solo para piezas elegibles. La mano de obra no está incluida. Pregúntenos qué piezas califican.',
        'points': ['Solo para piezas elegibles, no mano de obra', 'La aprobación no está garantizada', 'Aplican los términos de Acima'],
        'cta': 'Contáctenos sobre Acima', 'cta_apply': 'Solicitar con Acima',
        'sms': 'Hola L&M Tire, tengo una pregunta sobre el arrendamiento de Acima para piezas.',
    },
}

REVIEWS = {
    'en': {'kicker': 'Google reviews', 'title': 'What our customers say', 'read': 'Read our reviews on Google', 'write': 'Leave us a Google review', 'ask': 'Been here before? A short review helps your neighbors find us.', 'rating': '{r} out of 5 on Google · {n} reviews'},
    'pt': {'kicker': 'Avaliações no Google', 'title': 'O que dizem nossos clientes', 'read': 'Ver avaliações no Google', 'write': 'Deixe uma avaliação no Google', 'ask': 'Já é cliente? Uma avaliação curta ajuda seus vizinhos a nos encontrar.', 'rating': '{r} de 5 no Google · {n} avaliações'},
    'es': {'kicker': 'Reseñas en Google', 'title': 'Lo que dicen nuestros clientes', 'read': 'Ver reseñas en Google', 'write': 'Déjenos una reseña en Google', 'ask': '¿Ya nos visitó? Una reseña corta ayuda a sus vecinos a encontrarnos.', 'rating': '{r} de 5 en Google · {n} reseñas'},
}

PHOTO_TEXT = {
    'en': {'kicker': 'The shop', 'title': 'Inside L&M Tire', 'cats': {'exterior': 'Shop exterior', 'bays': 'Service bays', 'tires': 'Tire inventory', 'alignment': 'Wheel alignment', 'equipment': 'Repair equipment', 'team': 'Our team'}},
    'pt': {'kicker': 'A oficina', 'title': 'Por dentro da L&M Tire', 'cats': {'exterior': 'Fachada', 'bays': 'Boxes de serviço', 'tires': 'Estoque de pneus', 'alignment': 'Alinhamento', 'equipment': 'Equipamentos', 'team': 'Nossa equipe'}},
    'es': {'kicker': 'El taller', 'title': 'Por dentro de L&M Tire', 'cats': {'exterior': 'Fachada', 'bays': 'Áreas de servicio', 'tires': 'Inventario de llantas', 'alignment': 'Alineación', 'equipment': 'Equipo de reparación', 'team': 'Nuestro equipo'}},
}

# ---------------------------------------------------------------- Sprint 3 settings

# Customer support CHANNELS. Each one is a job, not a person: the public site never names who answers it.
# To hand a channel to another employee or a central business line, change its phone/label here and rebuild;
# every page, form, text message, WhatsApp link and the contact card follow. Names shown to customers are in text3.py 'team'.
# 'whatsapp': True only for numbers confirmed to use WhatsApp (both support lines confirmed 2026-11-26; the shop landline has none).
CONTACTS = {
    # 'calls': True only for the number that answers phone calls. The messaging lines CAN ring, but voice/video calls
    # are not answered, so the site never makes a call link or call icon for them and says so politely.
    'shop':          {'phone': '+15088533322', 'label': '508-853-3322', 'langs': ['en'], 'calls': True, 'sms': False, 'whatsapp': False},
    'support_en_es': {'phone': '+13048066047', 'label': '304-806-6047', 'langs': ['en', 'es'], 'calls': False, 'sms': True, 'whatsapp': True},
    'support_pt':    {'phone': '+17742889675', 'label': '774-288-9675', 'langs': ['pt'], 'calls': False, 'sms': True, 'whatsapp': True},
}
CALL_LINE = 'shop'   # every Call button on the site goes here
# Order on the Contact page and the contact card.
TEAM = ['shop', 'support_en_es', 'support_pt']
# Which channel answers texts and website requests in each language.
ROUTE = {'en': 'support_en_es', 'es': 'support_en_es', 'pt': 'support_pt'}

# Public customer service email (confirmed by the shop 2026-11-26): requests, quotes, questions, feedback, Contact page, contact card.
# The corporate email is kept OFF the website on purpose.
EMAIL = 'care.lmtire@gmail.com'

# Social pages: links stay hidden until a real address is filled in. Nothing loads from these sites.
SOCIAL = {'youtube': '', 'instagram': '', 'facebook': ''}

# Numbers shown on the site. Only verified facts. None = hidden.
STATS = {
    'since': '2013',          # confirmed by the shop
    'languages': 3,           # English, Portuguese, Spanish (confirmed)
    'google_reviews': None,   # fill from the Google Business Profile only
    'carfax_reviews': None,   # fill from CARFAX only
    'vehicles_serviced': None,
    'tires_in_stock': None,   # later from the shop app
}

# Website appointment and quote requests. Until a delivery method is set up, requests go by text only.
# 'endpoint': the address the form posts to (for example '/api/request.php' on Hostinger). Empty = no online sending.
# The form only says "received" when the endpoint answers {"ok": true}.
DELIVERY = {'endpoint': ''}

# Tire inventory from the shop app (future). See tools/inventory.py for the public data contract.
# mode: 'quote' (no stock or prices shown, customers ask by text), 'availability' (in stock / can order),
#       'tire_price' (price per tire), 'installed_price' (installed price), 'both' (tire and installed price).
# Prices and stock are published only after the shop verifies the data and approves the mode.
INVENTORY = {'mode': 'quote', 'feed': ''}

# Background music (optional for visitors, off by default). The track's commercial rights are NOT confirmed yet
# (see MEDIA-LICENSES.md), so it stays out of the production site until LICENSED is True. Preview builds show it for review.
MUSIC = {'file': 'ambient-loop.mp3', 'licensed': False}
