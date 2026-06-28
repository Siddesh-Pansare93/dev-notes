---
tags: [ecosystem, mapstruct, dto, mapping]
aliases: [MapStruct, DTO Mapping]
stage: intermediate
---

# MapStruct

> [!info] For the Express/TS dev
> Java codebases obsess over DTO ↔ Entity boundaries. Hand-writing `entityToDto(...)` methods is tedious and error-prone. MapStruct generates these mappers at **compile time** from an interface — no reflection, no runtime overhead. Output is plain Java code you can read.

## Why?

```java
// Without MapStruct — manual mapping
public OrderDto toDto(Order o) {
    OrderDto d = new OrderDto();
    d.setId(o.getId());
    d.setStatus(o.getStatus().name());
    d.setTotal(o.getTotal());
    d.setUserName(o.getUser().getName());
    // ... 30 fields, easy to forget one
    return d;
}
```

vs MapStruct:

```java
@Mapper(componentModel = "spring")
public interface OrderMapper {
    @Mapping(source = "user.name", target = "userName")
    OrderDto toDto(Order order);

    Order toEntity(OrderCreateDto dto);

    List<OrderDto> toDtoList(List<Order> orders);
}
```

That's it. The annotation processor generates the impl.

## Install

```xml
<properties>
    <mapstruct.version>1.6.3</mapstruct.version>
    <lombok.version>1.18.34</lombok.version>
</properties>

<dependencies>
    <dependency>
        <groupId>org.mapstruct</groupId>
        <artifactId>mapstruct</artifactId>
        <version>${mapstruct.version}</version>
    </dependency>
</dependencies>

<build>
    <plugins>
        <plugin>
            <artifactId>maven-compiler-plugin</artifactId>
            <configuration>
                <annotationProcessorPaths>
                    <path>
                        <groupId>org.mapstruct</groupId>
                        <artifactId>mapstruct-processor</artifactId>
                        <version>${mapstruct.version}</version>
                    </path>
                    <!-- Lombok must come BEFORE MapStruct if used together -->
                    <path>
                        <groupId>org.projectlombok</groupId>
                        <artifactId>lombok</artifactId>
                        <version>${lombok.version}</version>
                    </path>
                    <path>
                        <groupId>org.projectlombok</groupId>
                        <artifactId>lombok-mapstruct-binding</artifactId>
                        <version>0.2.0</version>
                    </path>
                </annotationProcessorPaths>
            </configuration>
        </plugin>
    </plugins>
</build>
```

## Use as a Spring bean

`componentModel = "spring"` makes the generated class a `@Component`:

```java
@Service
@RequiredArgsConstructor
public class OrderService {
    private final OrderMapper mapper;     // injected
    private final OrderRepository repo;

    public OrderDto getById(Long id) {
        return mapper.toDto(repo.findById(id).orElseThrow());
    }
}
```

## Common patterns

### Field renaming

```java
@Mapping(source = "user.id", target = "userId")
@Mapping(source = "createdAt", target = "created")
OrderDto toDto(Order o);
```

### Constants & expressions

```java
@Mapping(target = "version", constant = "v2")
@Mapping(target = "fullName", expression = "java(o.getFirstName() + \" \" + o.getLastName())")
@Mapping(target = "id", ignore = true)
UserDto toDto(User o);
```

### Nested mapping

```java
@Mapper(componentModel = "spring", uses = AddressMapper.class)
public interface UserMapper {
    UserDto toDto(User u);
}
```

`UserDto.address` is mapped via the `AddressMapper` bean.

### Update existing instance

```java
@Mapping(target = "id", ignore = true)
void updateEntity(@MappingTarget Order target, OrderUpdateDto src);
```

Useful for PATCH endpoints — only non-null source fields update target:

```java
@BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
void patch(@MappingTarget Order target, OrderPatchDto src);
```

### Custom converters

```java
@Named("toIso")
default String toIso(Instant i) {
    return i == null ? null : i.toString();
}

@Mapping(source = "createdAt", target = "createdAt", qualifiedByName = "toIso")
OrderDto toDto(Order o);
```

### Enum mapping

```java
@ValueMapping(source = "PAID", target = "COMPLETED")
@ValueMapping(source = MappingConstants.ANY_REMAINING, target = MappingConstants.NULL)
PublicStatus map(InternalStatus s);
```

## Generated code (you can inspect it)

After build, look in `target/generated-sources/annotations/`:

```java
@Component
public class OrderMapperImpl implements OrderMapper {
    @Override
    public OrderDto toDto(Order order) {
        if (order == null) return null;
        OrderDto dto = new OrderDto();
        dto.setId(order.getId());
        if (order.getUser() != null) {
            dto.setUserName(order.getUser().getName());
        }
        // ...
        return dto;
    }
}
```

No reflection. Compile-time errors if a field can't be mapped.

## Strict mode

```java
@Mapper(componentModel = "spring",
        unmappedTargetPolicy = ReportingPolicy.ERROR,
        unmappedSourcePolicy = ReportingPolicy.WARN)
```

Now any unmapped target field fails the build — catches drift between DTO and entity.

## With Lombok

Lombok must run first to generate getters/setters before MapStruct reads them. Add `lombok-mapstruct-binding` (shown in the install above) so MapStruct sees Lombok-generated members.

## Records support

MapStruct supports `record` types. Use the canonical constructor mapping:

```java
public record OrderDto(Long id, String status, BigDecimal total) {}

@Mapper(componentModel = "spring")
public interface OrderMapper {
    OrderDto toDto(Order order);
}
```

## Alternatives

| Tool | Notes |
|------|-------|
| **ModelMapper** | Reflection-based, runtime, slower |
| **Dozer** | Old, slow, avoid |
| **Manual mapping** | Fine for small projects |
| **MapStruct** | Recommended for non-trivial codebases |

## Related
- [[01-Library-Cheatsheet]]
- [[02-Lombok]]
- [[02-Entity-Basics]]
- [[03-DTOs-and-Serialization]]
