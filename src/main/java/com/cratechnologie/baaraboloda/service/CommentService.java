package com.cratechnologie.baaraboloda.service;

import com.cratechnologie.baaraboloda.domain.Comment;
import com.cratechnologie.baaraboloda.repository.CommentRepository;
import com.cratechnologie.baaraboloda.service.dto.CommentDTO;
import com.cratechnologie.baaraboloda.service.mapper.CommentMapper;
import com.cratechnologie.baaraboloda.web.rest.errors.BadRequestAlertException;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Optional;
import javax.imageio.ImageIO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service Implementation for managing {@link com.cratechnologie.baaraboloda.domain.Comment}.
 */
@Service
@Transactional
public class CommentService {

    private static final Logger LOG = LoggerFactory.getLogger(CommentService.class);

    private final CommentRepository commentRepository;

    private final CommentMapper commentMapper;
    private final NotificationService notifications;

    public CommentService(CommentRepository commentRepository, CommentMapper commentMapper, NotificationService notifications) {
        this.commentRepository = commentRepository;
        this.commentMapper = commentMapper;
        this.notifications = notifications;
    }

    /**
     * Save a comment.
     *
     * @param commentDTO the entity to save.
     * @return the persisted entity.
     */
    public CommentDTO save(CommentDTO commentDTO) {
        ImageAttachmentValidator.validate(commentDTO.getImages());
        validateImage(commentDTO);
        LOG.debug("Request to save Comment : {}", commentDTO);
        Comment comment = commentMapper.toEntity(commentDTO);
        comment = commentRepository.save(comment);
        notifications.comment(comment.getTask().getId(), comment.getContent());
        return commentMapper.toDto(comment);
    }

    /**
     * Update a comment.
     *
     * @param commentDTO the entity to save.
     * @return the persisted entity.
     */
    public CommentDTO update(CommentDTO commentDTO) {
        ImageAttachmentValidator.validate(commentDTO.getImages());
        validateImage(commentDTO);
        LOG.debug("Request to update Comment : {}", commentDTO);
        Comment comment = commentMapper.toEntity(commentDTO);
        comment = commentRepository.save(comment);
        return commentMapper.toDto(comment);
    }

    /**
     * Partially update a comment.
     *
     * @param commentDTO the entity to update partially.
     * @return the persisted entity.
     */
    public Optional<CommentDTO> partialUpdate(CommentDTO commentDTO) {
        ImageAttachmentValidator.validate(commentDTO.getImages());
        validateImage(commentDTO);
        LOG.debug("Request to partially update Comment : {}", commentDTO);

        return commentRepository
            .findById(commentDTO.getId())
            .map(existingComment -> {
                commentMapper.partialUpdate(existingComment, commentDTO);

                return existingComment;
            })
            .map(commentRepository::save)
            .map(commentMapper::toDto);
    }

    /**
     * Get all the comments with eager load of many-to-many relationships.
     *
     * @return the list of entities.
     */
    public Page<CommentDTO> findAllWithEagerRelationships(Pageable pageable) {
        return commentRepository.findAllWithEagerRelationships(pageable).map(commentMapper::toDto);
    }

    /**
     * Get one comment by id.
     *
     * @param id the id of the entity.
     * @return the entity.
     */
    @Transactional(readOnly = true)
    public Optional<CommentDTO> findOne(Long id) {
        LOG.debug("Request to get Comment : {}", id);
        return commentRepository.findOneWithEagerRelationships(id).map(commentMapper::toDto);
    }

    /**
     * Delete the comment by id.
     *
     * @param id the id of the entity.
     */
    private void validateImage(CommentDTO comment) {
        if (comment.getImage() == null) {
            return;
        }
        if (comment.getImage().length == 0 || comment.getImage().length > 2097152) {
            throw new BadRequestAlertException("La capture doit faire au maximum 2 Mo.", "comment", "invalidimage");
        }
        try (var stream = ImageIO.createImageInputStream(new ByteArrayInputStream(comment.getImage()))) {
            var readers = ImageIO.getImageReaders(stream);
            if (!readers.hasNext()) {
                throw new IOException("Invalid image");
            }
            var reader = readers.next();
            try {
                reader.setInput(stream);
                String format = reader.getFormatName();
                String contentType = "PNG".equalsIgnoreCase(format) ? "image/png" : "JPEG".equalsIgnoreCase(format) ? "image/jpeg" : null;
                if (contentType == null || reader.getWidth(0) > 8192 || reader.getHeight(0) > 8192) {
                    throw new IOException("Unsupported image");
                }
                comment.setImageContentType(contentType);
            } finally {
                reader.dispose();
            }
        } catch (IOException | IllegalArgumentException exception) {
            throw new BadRequestAlertException(
                "Choisissez une capture PNG ou JPEG valide (8192 pixels maximum).",
                "comment",
                "invalidimage"
            );
        }
    }

    public void delete(Long id) {
        LOG.debug("Request to delete Comment : {}", id);
        commentRepository.deleteById(id);
    }
}
