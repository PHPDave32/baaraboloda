package com.cratechnologie.baaraboloda;

import com.cratechnologie.baaraboloda.config.AsyncSyncConfiguration;
import com.cratechnologie.baaraboloda.config.DatabaseTestcontainer;
import com.cratechnologie.baaraboloda.config.RedisTestContainer;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Base composite annotation for integration tests.
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@SpringBootTest(
    classes = {
        BaaraBolodaApp.class,
        AsyncSyncConfiguration.class,
        com.cratechnologie.baaraboloda.config.JacksonHibernateConfiguration.class,
        DatabaseTestcontainer.class,
        RedisTestContainer.class,
    }
)
public @interface IntegrationTest {}
