package com.cratechnologie.baaraboloda.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.cratechnologie.baaraboloda.domain.Comment;
import com.cratechnologie.baaraboloda.repository.CommentRepository;
import com.cratechnologie.baaraboloda.service.dto.CommentDTO;
import com.cratechnologie.baaraboloda.service.mapper.CommentMapper;
import com.cratechnologie.baaraboloda.web.rest.errors.BadRequestAlertException;
import java.util.Base64;
import org.junit.jupiter.api.Test;

class CommentImageTest {

    private final CommentRepository repository = mock(CommentRepository.class);
    private final CommentMapper mapper = mock(CommentMapper.class);
    private final CommentService service = new CommentService(repository, mapper, mock(NotificationService.class));

    @Test
    void detectsActualPngTypeBeforeSaving() {
        CommentDTO dto = new CommentDTO();
        dto.setContent("");
        dto.setImage(
            Base64.getDecoder().decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9ioAAAAASUVORK5CYII=")
        );
        dto.setImageContentType("text/html");
        Comment entity = new Comment().task(new com.cratechnologie.baaraboloda.domain.Task().id(1L));
        when(mapper.toEntity(dto)).thenReturn(entity);
        when(repository.save(entity)).thenReturn(entity);
        service.save(dto);
        assertThat(dto.getImageContentType()).isEqualTo("image/png");
        verify(repository).save(entity);
    }

    @Test
    void rejectsNonImageBeforePersistence() {
        CommentDTO dto = new CommentDTO();
        dto.setImage(new byte[] { 1, 2, 3 });
        assertThatThrownBy(() -> service.save(dto)).isInstanceOf(BadRequestAlertException.class);
        verifyNoInteractions(repository, mapper);
    }

    @Test
    void rejectsOversizedImageOnPartialUpdate() {
        CommentDTO dto = new CommentDTO();
        dto.setImage(new byte[2097153]);
        assertThatThrownBy(() -> service.partialUpdate(dto)).isInstanceOf(BadRequestAlertException.class);
        verifyNoInteractions(repository, mapper);
    }
}
