package com.cratechnologie.baaraboloda.security;

import com.cratechnologie.baaraboloda.repository.UserRepository;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class CurrentUserJwtConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    private final UserRepository users;

    public CurrentUserJwtConverter(UserRepository users) {
        this.users = users;
    }

    @Override
    @Transactional(readOnly = true)
    public AbstractAuthenticationToken convert(Jwt jwt) {
        var user = users
            .findForAuthorization(jwt.getSubject())
            .filter(u -> u.isActivated())
            .orElseThrow(() -> new OAuth2AuthenticationException(new OAuth2Error("invalid_token")));
        Number id = jwt.getClaim(SecurityUtils.USER_ID_CLAIM);
        if (id != null && id.longValue() != user.getId()) throw new OAuth2AuthenticationException(new OAuth2Error("invalid_token"));
        return new JwtAuthenticationToken(
            jwt,
            EffectiveAuthorities.of(user).stream().map(SimpleGrantedAuthority::new).toList(),
            user.getLogin()
        );
    }
}
