# Maratona Full Cycle - Codelivery - Part II

O projeto consiste em:

- Um sistema de monitoramento de veículos de entrega em tempo real.

Requisitos:

- Uma transportadora quer fazer o agendamento de suas entregas;
- Ela também quer ter o _feedback_ instantâneo de quando a entrega é realizada;
- Caso haja necessidade de acompanhar a entrega com mais detalhes, o sistema deverá informar, em tempo real, a localização do motorista no mapa.

#### Que problemas de negócio o projeto poderia resolver?

- O projeto pode ser adaptado para casos de uso onde é necessário rastrear e monitorar carros, caminhões, frotas e remessas em tempo real, como na logística e na indústria automotiva.

Dinâmica do sistema:

1. A aplicação Order (_React_/_Nest.js_) é responsável pelas ordens de serviço (ou pedidos) e vai conter a tela de agendamento de pedidos de entrega. A criação de uma nova ordem de serviço começa o processo para que o motorista entregue a mercadoria;

2. A aplicação _Driver_ (_Go_) é responsável por gerenciar o contexto limitado de motoristas. Neste caso, sua responsabilidade consiste em disponibilizar os _endpoints_ de consulta;

3. Para a criação de uma nova ordem de serviço, a aplicação _Order_ obtém de _Driver_ os dados dos motoristas. Neste caso, _REST_ é uma opção pertinente, porque a comunicação deve ser a mais simples possível;

4. Após criar a nova ordem de serviço, _Order_ notifica a aplicação _Mapping_ (_Nest.js_/_React_) via _RabbitMQ_ de que o motorista deve iniciar a entrega. _Mapping_ é a aplicação que vai exibir no mapa a posição do motorista em tempo real. A aplicação _Simulator_ (_Go_) também é notificada sobre o início da entrega e começa a enviar para a aplicação _Mapping_ as posições do veículo;

5. Ao finalizar a entrega, a aplicação _Mapping_ notifica via _RabbitMQ_ a aplicação _Order_ de que o produto foi entregue e a aplicação altera o _status_ da entrega de Pendente para Entregue.

## Tecnologias

#### Operate What You Build

- Nesta segunda versão, trabalhamos com o _frontend_. Posteriormente, serão adicionadas as tecnologias de integração contínua, _deploy_ e observabilidade.

  - Backend

    - Golang
    - TypeScript
    - Nest.js
    - RabbitMQ
    - MySQL

  - Frontend (sem SPA)
    - React

## Formatos de Comunicação

- _REST_
- Sistema de mensageria (_RabbitMQ_)

### Order

- _Order_ é a aplicação responsável pelo agendamento de pedidos de entrega. É onde todo o processo de entrega começa; a partir da criação de um novo pedido, as demais aplicações são ativadas.
- Interessante notar que trata-se de uma aplicação ou microsserviço _CRUD_, utilizando _backend_ (_Nest.js_) e frontend (_React_) ao mesmo tempo.
- Vejamos 3 possíveis cenários de comunicação entre a aplicação _Order_ com as demais:

#### Buscar Motoristas

- É necessário buscar a relação de motoristas cadastrados para o usuário selecionar no momento de agendar um novo pedido de entrega.
- Neste caso, uma requisição direta via _HTTP_ é mais simples e faz mais sentido do que, por exemplo, comunicar via mensageria para um processamento em segundo plano.
- Dessa forma, a partir do _browser_, é disparada a chamada _REST_ para a própria _API_ no _backend_ da aplicação (_Nest.js_), que encaminha para a aplicação _Driver_.

#### Criar Pedido

- A partir da criação de um novo pedido, os dados de _Order_ são publicados no _RabbitMQ_. Então, as aplicações _Simulator_ e _Mapping_ são notificadas.
- A aplicação _Simulator_, a cada novo pedido, começa a enviar os dados de latitude e longitude via _RabbitMQ_ para a aplicação _Mapping_ fazer o rastreio do veículo no mapa.
- A aplicação _Mapping_, quando notificada da criação de um novo pedido, inclui em sua base de dados as informações para poder gerenciar no mapa o pedido que está sendo rastreado.

#### Atualizar Status de Entrega

- No momento em que o motorista chega em seu destino, o que acontece?
- Em determinado momento, a aplicação _Simulator_ publica uma informação via _RabbitMQ_ para a aplicação _Mapping_ saber que o motorista chegou.
- Então, _Mapping_ atualiza o pedido em sua base de dados com o _status_ de Entregue. Uma vez que tenha feito isso, _Mapping_ publica uma mensagem no _RabbitMQ_ para a aplicação _Order_ também alterar na sua base de dados o _status_ do pedido como Entregue.
- Assim, é de responsabilidade da aplicação _Mapping_ a organização do _status_ do pedido no sistema.

### Frontend

- Trabalha-se com o _React_ de forma direta (_standalone_, sem o uso de módulos), importando de um _CDN_, sem preocupar-se com os conceitos de uma _Single Page Application_ (_SPA_).
- Além do _React_, o _ReactDOM_, o _Material UI_ (biblioteca _React_ baseada nos conceitos do _Material Design_) e o _Babel_ (compilador _JavaScript_ que permite trabalhar com _JSX_ (para inserir _HTML_ no meio do _JavaScript_)) são carregados a partir de um _CDN_.
- Então, o _React_ é incorporado dentro de um sistema de _views_, utilizando-se a biblioteca de _templates_ _Handlebars_ (https://handlebarsjs.com).

### Execução

#### RabbitMQ

1. Dentro do diretório _rabbitmq_, executar o comando: `docker-compose up -d`;

2. Acessar o Painel Administrativo: `localhost:15672`; _Username_: _admin_ / _Password_: _admin_;

3. Criar uma fila _micro-simulator/orders-new_ - responsável por notificar o _Simulator_ de que um novo pedido foi criado;

4. Adicionar um Bind à fila _micro-simulator/orders-new_ - _From exchange_: _amq.direct_; _Routing key_: _orders.new_;

5. Criar uma fila _micro-mapping/orders-new_ - responsável por notificar _Mapping_ de que um novo pedido foi criado;

6. Adicionar um Bind à fila _micro-mapping/orders-new_ - _From exchange_: _amq.direct_; _Routing key_: _orders.new_;

7. Criar uma fila _micro-orders/change-status_ - responsável por notificar _Order_ de que o pedido foi entregue;

8. Adicionar um _Bind_ à fila _micro-orders/change-status_ - _From exchange_: _amq.direct_; _Routing key_: _orders.change-status_;

![List of queues](./images/list-of-queues.png)

#### Driver

9. Dentro do diretório _driver_, executar o comando: `docker-compose up -d`;

10. Para entrar no _container_, executar o comando: `docker-compose exec goapp_driver bash`;

11. Para rodar a aplicação e subir o servidor _HTTP_, executar o comando: `go run driver.go`;

#### Simulator

12. Dentro do diretório _simulator_, executar o comando: `docker-compose up -d`;

13. Para entrar no _container_, executar o comando: `docker-compose exec goapp_simulator bash`;

14. Para rodar a aplicação e conectar no _RabbitMQ_, executar o comando: `go run simulator.go`;

#### Order

15. Dentro do diretório _micro-order_, executar o comando: `docker-compose up`;

16. Acessar a aplicação: `localhost:3000/orders`;

![Agendamento de pedidos de entrega](./images/agendamento-pedidos-entrega.png)

17. Clicar em `Novo Pedido`;

18. Selecionar _Motorista_ e _Destino_;

![Novo pedido](./images/novo-pedido.png)

19. Clicar `Enviar`;

#### Simulator

20. Acompanhar os _logs_ das mensagens sendo publicadas no _RabbitMQ_ com os dados de latitude e longitude;

![Logs de mensagens publicadas no RabbitMQ](./images/logs-mensagens-publicadas-rabbitmq.png)

21. Ao publicar latitude 0 e longitude 0 no RabbitMQ, sinaliza para a aplicação _Mapping_ que o pedido foi entregue.

![Latitude e longitude 0](./images/latitude-0-longitude-0.png)

#### RabbitMQ

22. Verificar os totais de mensagens recebidas nas filas.

![Totais de mensagens recebidas nas filas](./images/totais-mensagens-filas.png)
