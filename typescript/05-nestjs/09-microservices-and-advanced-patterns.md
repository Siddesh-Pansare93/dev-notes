# Microservices and Advanced Patterns

## What You'll Learn

- NestJS microservices architecture and transport layers
- Communicating between services with `@MessagePattern` and `@EventPattern`
- Using `ClientProxy` to send messages from one service to another
- Building hybrid applications (HTTP + microservice)
- Implementing the CQRS pattern with `@nestjs/cqrs`
- Real-time communication with WebSockets

---

## NestJS Microservices Overview

NestJS provides a first-class microservices layer. Instead of (or alongside) HTTP, your application can communicate using message-based transports like TCP, Redis, RabbitMQ, NATS, or gRPC.

Install the microservices package:

```bash
npm install @nestjs/microservices
```

> **Coming from JS:** In plain Node.js, building a microservice typically means choosing a message broker, writing custom connection/serialization logic, and building your own request-reply patterns. NestJS abstracts all of this behind a unified decorator-based API. Switching from TCP to Redis is often a one-line config change.

---

## Creating a Microservice

A standalone microservice (no HTTP):

```typescript
// main.ts (orders microservice)
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { OrdersModule } from './orders.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    OrdersModule,
    {
      transport: Transport.TCP,
      options: {
        host: '0.0.0.0',
        port: 3001,
      },
    },
  );

  await app.listen();
  console.log('Orders microservice is listening on port 3001');
}
bootstrap();
```

---

## Transport Layers

```typescript
// TCP (default, good for development)
{ transport: Transport.TCP, options: { host: '0.0.0.0', port: 3001 } }

// Redis (pub/sub)
{ transport: Transport.REDIS, options: { host: 'localhost', port: 6379 } }

// RabbitMQ (AMQP)
{
  transport: Transport.RMQ,
  options: {
    urls: ['amqp://localhost:5672'],
    queue: 'orders_queue',
    queueOptions: { durable: true },
  },
}

// NATS
{ transport: Transport.NATS, options: { servers: ['nats://localhost:4222'] } }

// gRPC
{
  transport: Transport.GRPC,
  options: {
    package: 'orders',
    protoPath: join(__dirname, 'orders.proto'),
    url: '0.0.0.0:5000',
  },
}
```

---

## Message Patterns and Event Patterns

### @MessagePattern — Request/Response

The caller sends a message and waits for a reply:

```typescript
// orders/orders.controller.ts (microservice side)
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @MessagePattern({ cmd: 'create_order' })
  async createOrder(@Payload() data: CreateOrderDto) {
    return this.ordersService.create(data);
  }

  @MessagePattern({ cmd: 'get_order' })
  async getOrder(@Payload() data: { id: string }) {
    return this.ordersService.findOne(data.id);
  }

  @MessagePattern({ cmd: 'list_orders_by_user' })
  async listOrdersByUser(@Payload() data: { userId: string }) {
    return this.ordersService.findByUser(data.userId);
  }
}
```

### @EventPattern — Fire and Forget

The caller emits an event and does not wait for a response:

```typescript
// notifications/notifications.controller.ts
import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { NotificationsService } from './notifications.service';

@Controller()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @EventPattern('order_created')
  async handleOrderCreated(
    @Payload() data: { orderId: string; userId: string; total: number },
  ) {
    await this.notificationsService.sendOrderConfirmation(data);
  }

  @EventPattern('payment_failed')
  async handlePaymentFailed(
    @Payload() data: { orderId: string; reason: string },
  ) {
    await this.notificationsService.sendPaymentFailureAlert(data);
  }
}
```

---

## ClientProxy — Sending Messages

From the API gateway (or any caller service), register a client and inject it:

```typescript
// api-gateway/api-gateway.module.ts
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { OrdersGatewayController } from './orders-gateway.controller';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'ORDERS_SERVICE',
        transport: Transport.TCP,
        options: { host: 'localhost', port: 3001 },
      },
      {
        name: 'NOTIFICATIONS_SERVICE',
        transport: Transport.REDIS,
        options: { host: 'localhost', port: 6379 },
      },
    ]),
  ],
  controllers: [OrdersGatewayController],
})
export class ApiGatewayModule {}
```

```typescript
// api-gateway/orders-gateway.controller.ts
import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Inject,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersGatewayController {
  constructor(
    @Inject('ORDERS_SERVICE') private readonly ordersClient: ClientProxy,
    @Inject('NOTIFICATIONS_SERVICE') private readonly notificationsClient: ClientProxy,
  ) {}

  @Post()
  async createOrder(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateOrderDto,
  ) {
    // Request-response: send and wait for reply
    const order = await firstValueFrom(
      this.ordersClient.send({ cmd: 'create_order' }, { ...dto, userId }),
    );

    // Fire-and-forget: emit event, do not wait
    this.notificationsClient.emit('order_created', {
      orderId: order.id,
      userId,
      total: order.total,
    });

    return order;
  }

  @Get(':id')
  async getOrder(@Param('id') id: string) {
    return firstValueFrom(
      this.ordersClient.send({ cmd: 'get_order' }, { id }),
    );
  }
}
```

> **Coming from JS:** Notice `firstValueFrom` — `ClientProxy.send()` returns an RxJS Observable. If you prefer Promises, wrap it with `firstValueFrom`. The `emit()` method for events returns an Observable too, but since it is fire-and-forget, you typically do not subscribe.

---

## Hybrid Applications

Serve both HTTP and a microservice transport from a single application:

```typescript
// main.ts (hybrid)
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Attach a microservice transport alongside HTTP
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.REDIS,
    options: { host: 'localhost', port: 6379 },
  });

  await app.startAllMicroservices();
  await app.listen(3000);

  console.log('HTTP on :3000, Redis microservice connected');
}
bootstrap();
```

This allows the same application to handle REST requests via `@Controller()` and microservice messages via `@MessagePattern()` / `@EventPattern()` simultaneously.

---

## CQRS Pattern with @nestjs/cqrs

CQRS (Command Query Responsibility Segregation) separates read operations (queries) from write operations (commands), with events as side effects.

```bash
npm install @nestjs/cqrs
```

### Project Structure

```
orders/
  commands/
    handlers/
      create-order.handler.ts
    impl/
      create-order.command.ts
  queries/
    handlers/
      get-order.handler.ts
    impl/
      get-order.query.ts
  events/
    handlers/
      order-created.handler.ts
    impl/
      order-created.event.ts
  orders.module.ts
```

### Command

```typescript
// commands/impl/create-order.command.ts
export class CreateOrderCommand {
  constructor(
    public readonly userId: string,
    public readonly items: { productId: string; quantity: number }[],
    public readonly shippingAddress: string,
  ) {}
}
```

### Command Handler

```typescript
// commands/handlers/create-order.handler.ts
import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { CreateOrderCommand } from '../impl/create-order.command';
import { OrderCreatedEvent } from '../../events/impl/order-created.event';
import { OrdersRepository } from '../../orders.repository';

@CommandHandler(CreateOrderCommand)
export class CreateOrderHandler implements ICommandHandler<CreateOrderCommand> {
  constructor(
    private readonly ordersRepo: OrdersRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: CreateOrderCommand): Promise<string> {
    const { userId, items, shippingAddress } = command;

    // Calculate total
    const total = await this.ordersRepo.calculateTotal(items);

    // Persist the order
    const order = await this.ordersRepo.create({
      userId,
      items,
      shippingAddress,
      total,
      status: 'pending',
    });

    // Publish domain event
    this.eventBus.publish(
      new OrderCreatedEvent(order.id, userId, total),
    );

    return order.id;
  }
}
```

### Query

```typescript
// queries/impl/get-order.query.ts
export class GetOrderQuery {
  constructor(public readonly orderId: string) {}
}
```

### Query Handler

```typescript
// queries/handlers/get-order.handler.ts
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetOrderQuery } from '../impl/get-order.query';
import { OrdersRepository } from '../../orders.repository';
import { NotFoundException } from '@nestjs/common';

@QueryHandler(GetOrderQuery)
export class GetOrderHandler implements IQueryHandler<GetOrderQuery> {
  constructor(private readonly ordersRepo: OrdersRepository) {}

  async execute(query: GetOrderQuery) {
    const order = await this.ordersRepo.findById(query.orderId);
    if (!order) {
      throw new NotFoundException(`Order ${query.orderId} not found`);
    }
    return order;
  }
}
```

### Event

```typescript
// events/impl/order-created.event.ts
export class OrderCreatedEvent {
  constructor(
    public readonly orderId: string,
    public readonly userId: string,
    public readonly total: number,
  ) {}
}
```

### Event Handler

```typescript
// events/handlers/order-created.handler.ts
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { OrderCreatedEvent } from '../impl/order-created.event';

@EventsHandler(OrderCreatedEvent)
export class OrderCreatedHandler implements IEventHandler<OrderCreatedEvent> {
  handle(event: OrderCreatedEvent): void {
    console.log(`Order ${event.orderId} created — total: $${event.total}`);
    // Send confirmation email, update analytics, notify warehouse, etc.
  }
}
```

### Wiring the Module

```typescript
// orders/orders.module.ts
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { OrdersController } from './orders.controller';
import { OrdersRepository } from './orders.repository';
import { CreateOrderHandler } from './commands/handlers/create-order.handler';
import { GetOrderHandler } from './queries/handlers/get-order.handler';
import { OrderCreatedHandler } from './events/handlers/order-created.handler';

const CommandHandlers = [CreateOrderHandler];
const QueryHandlers = [GetOrderHandler];
const EventHandlers = [OrderCreatedHandler];

@Module({
  imports: [CqrsModule],
  controllers: [OrdersController],
  providers: [
    OrdersRepository,
    ...CommandHandlers,
    ...QueryHandlers,
    ...EventHandlers,
  ],
})
export class OrdersModule {}
```

### Using Commands and Queries in a Controller

```typescript
// orders/orders.controller.ts
import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateOrderCommand } from './commands/impl/create-order.command';
import { GetOrderQuery } from './queries/impl/get-order.query';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: { items: { productId: string; quantity: number }[]; shippingAddress: string },
  ) {
    const orderId = await this.commandBus.execute(
      new CreateOrderCommand(userId, dto.items, dto.shippingAddress),
    );
    return { orderId };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.queryBus.execute(new GetOrderQuery(id));
  }
}
```

> **Coming from JS:** CQRS may feel like over-engineering for small apps, and it often is. The pattern shines when your read and write models diverge (for example, writes go to a normalized relational DB while reads come from a denormalized cache or search index). Start simple and adopt CQRS only when the complexity is justified.

---

## WebSockets with NestJS

Install the WebSocket adapter:

```bash
npm install @nestjs/websockets @nestjs/platform-socket.io
npm install -D @types/socket.io
```

### Gateway (WebSocket Handler)

```typescript
// chat/chat.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';

interface ChatMessage {
  room: string;
  text: string;
  sender: string;
}

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/chat',
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger = new Logger('ChatGateway');

  afterInit(server: Server) {
    this.logger.log('WebSocket gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_room')
  handleJoinRoom(
    @MessageBody() data: { room: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(data.room);
    this.server.to(data.room).emit('user_joined', {
      userId: client.id,
      room: data.room,
    });
    return { event: 'joined', data: { room: data.room } };
  }

  @SubscribeMessage('leave_room')
  handleLeaveRoom(
    @MessageBody() data: { room: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(data.room);
    this.server.to(data.room).emit('user_left', { userId: client.id });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('send_message')
  handleMessage(
    @MessageBody() data: ChatMessage,
    @ConnectedSocket() client: Socket,
  ) {
    // Broadcast to everyone in the room except the sender
    client.to(data.room).emit('new_message', {
      text: data.text,
      sender: data.sender,
      timestamp: new Date().toISOString(),
    });

    return { event: 'message_sent', data: { status: 'ok' } };
  }

  // Server-initiated broadcast (callable from services)
  broadcastToRoom(room: string, event: string, data: any) {
    this.server.to(room).emit(event, data);
  }
}
```

### WebSocket JWT Guard

```typescript
// auth/guards/ws-jwt.guard.ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const client: Socket = context.switchToWs().getClient();
    const token =
      client.handshake.auth?.token ||
      client.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      throw new WsException('Missing authentication token');
    }

    try {
      const payload = this.jwtService.verify(token);
      client.data.user = payload;
      return true;
    } catch {
      throw new WsException('Invalid token');
    }
  }
}
```

### Chat Module

```typescript
// chat/chat.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ChatGateway } from './chat.gateway';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';

@Module({
  imports: [JwtModule.register({})],
  providers: [ChatGateway, WsJwtGuard],
  exports: [ChatGateway],
})
export class ChatModule {}
```

---

## Combining Microservices with WebSockets

A powerful pattern: a microservice event triggers a real-time push to connected clients.

```typescript
// notifications/notifications.controller.ts
import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { ChatGateway } from '../chat/chat.gateway';

@Controller()
export class NotificationsController {
  constructor(private readonly chatGateway: ChatGateway) {}

  @EventPattern('order_status_updated')
  handleOrderStatusUpdate(
    @Payload() data: { userId: string; orderId: string; status: string },
  ) {
    // Push a real-time update to the user's personal room
    this.chatGateway.broadcastToRoom(
      `user:${data.userId}`,
      'order_update',
      {
        orderId: data.orderId,
        status: data.status,
      },
    );
  }
}
```

---

## Architecture Summary

```
                    +-----------------+
  Browser -------->| API Gateway     |  (HTTP + WebSocket)
                    | - REST routes   |
                    | - WS Gateway   |
                    +-------+---------+
                            |
              +-------------+-------------+
              |             |             |
        +-----v----+  +----v-----+  +----v---------+
        | Orders   |  | Users    |  | Notifications |
        | Service  |  | Service  |  | Service       |
        | (TCP)    |  | (TCP)    |  | (Redis)       |
        +----------+  +----------+  +---------------+
```

Each box is a separate NestJS application. They communicate through their respective transport layers. The API Gateway is the only service exposed to the public internet.

---

## When to Use What

| Pattern | Good For |
|---|---|
| Monolith | Small-to-medium apps, faster development |
| Microservices (TCP) | Internal service-to-service, low latency |
| Microservices (RabbitMQ) | Reliable message delivery, work queues |
| Microservices (Redis) | Pub/sub events, lightweight messaging |
| CQRS | Complex domains, separate read/write scaling |
| WebSockets | Real-time updates, chat, live dashboards |
| Hybrid | Gradually splitting a monolith |

---

## Mini-Exercise

Build a simplified e-commerce notification system:

1. Create an `OrdersService` microservice (TCP on port 3001) with a `@MessagePattern({ cmd: 'create_order' })` that accepts an order and returns it with an ID.
2. Create an API Gateway (HTTP on port 3000) with a `POST /orders` endpoint that uses `ClientProxy` to send the create order command to the orders service.
3. After the order is created, emit an `'order_created'` event via Redis. Create a `NotificationsService` that listens for this event with `@EventPattern('order_created')` and logs the notification.
4. Add a WebSocket gateway to the API Gateway with a `@SubscribeMessage('subscribe_orders')` handler. When an order is created, push a real-time event to all subscribed clients.
5. (CQRS bonus) Refactor the orders service to use `CommandBus` for creating orders and `QueryBus` for fetching them. Publish an `OrderCreatedEvent` from the command handler and handle it in a separate event handler that updates an in-memory read model.

**Bonus:** Add a simple Saga that listens for `OrderCreatedEvent` and dispatches a `ProcessPaymentCommand` after a 2-second delay, simulating an async payment flow.
