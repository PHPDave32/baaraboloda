package com.cratechnologie.baaraboloda.config;

import com.cratechnologie.baaraboloda.web.rest.util.PublicIdResolver;
import java.util.List;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class PublicIdConfiguration implements WebMvcConfigurer {

    private final PublicIdResolver resolver;

    public PublicIdConfiguration(PublicIdResolver resolver) {
        this.resolver = resolver;
    }

    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(resolver);
    }
}
