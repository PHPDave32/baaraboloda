package com.cratechnologie.baaraboloda.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.jackson.autoconfigure.JacksonAutoConfiguration;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.javamail.JavaMailSender;
import tools.jackson.databind.ObjectMapper;

class NotificationDeliveryConfigurationTest {

    @Test
    void startsWithTheApplicationJacksonMapper() {
        new ApplicationContextRunner()
            .withConfiguration(AutoConfigurations.of(JacksonAutoConfiguration.class))
            .withBean(JdbcTemplate.class, () -> mock(JdbcTemplate.class))
            .withBean(JavaMailSender.class, () -> mock(JavaMailSender.class))
            .withUserConfiguration(NotificationDeliveryService.class)
            .run(context -> {
                assertThat(context).hasNotFailed().hasSingleBean(ObjectMapper.class).hasSingleBean(NotificationDeliveryService.class);
                assertThat(context.getBean(NotificationDeliveryService.class).emailAvailable()).isFalse();
                assertThat(context.getBean(NotificationDeliveryService.class).pushKey()).isEmpty();
            });
    }
}
