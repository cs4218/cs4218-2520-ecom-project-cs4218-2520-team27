import mongoose from 'mongoose';
import productModel from './productModel.js';

describe('Product Model', () => {
  describe('Schema Definition', () => {
    it('should have all required fields defined', () => {
      // Arrange
      const schema = productModel.schema;
      const fieldNames = Object.keys(schema.paths);

      // Act & Assert
      expect(fieldNames).toContain('name');
      expect(fieldNames).toContain('slug');
      expect(fieldNames).toContain('description');
      expect(fieldNames).toContain('price');
      expect(fieldNames).toContain('category');
      expect(fieldNames).toContain('quantity');
      expect(fieldNames).toContain('photo.data');
      expect(fieldNames).toContain('photo.contentType');
      expect(fieldNames).toContain('shipping');
      expect(fieldNames).toContain('createdAt');
      expect(fieldNames).toContain('updatedAt');
    });

    it('should have timestamps automatically added', () => {
      // Arrange
      const schema = productModel.schema;

      // Act & Assert
      expect(schema.options.timestamps).toBe(true);
    });

    it('name field should be required and string', () => {
      // Arrange
      const schema = productModel.schema;
      const nameField = schema.paths.name;

      // Act & Assert
      expect(nameField.instance).toBe('String');
      expect(nameField.isRequired).toBe(true);
    });

    it('slug field should be required and string', () => {
      // Arrange
      const schema = productModel.schema;
      const slugField = schema.paths.slug;

      // Act & Assert
      expect(slugField.instance).toBe('String');
      expect(slugField.isRequired).toBe(true);
    });

    it('description field should be required and string', () => {
      // Arrange
      const schema = productModel.schema;
      const descriptionField = schema.paths.description;

      // Act & Assert
      expect(descriptionField.instance).toBe('String');
      expect(descriptionField.isRequired).toBe(true);
    });

    it('price field should be required and number', () => {
      // Arrange
      const schema = productModel.schema;
      const priceField = schema.paths.price;

      // Act & Assert
      expect(priceField.instance).toBe('Number');
      expect(priceField.isRequired).toBe(true);
    });

    it('category field should be required and reference Category model', () => {
      const schema = productModel.schema;
      const categoryField = schema.paths.category;

      expect(categoryField.instance).toBe('ObjectId');
      expect(categoryField.options.ref).toBe('Category');
      expect(categoryField.isRequired).toBe(true);
    });

    it('quantity field should be required and number', () => {
      // Arrange
      const schema = productModel.schema;
      const quantityField = schema.paths.quantity;

      // Act & Assert
      expect(quantityField.instance).toBe('Number');
      expect(quantityField.isRequired).toBe(true);
    });

    it('photo field should have data and contentType properties', () => {
      // Arrange
      const schema = productModel.schema;
      const photoDataField = schema.paths['photo.data'];
      const photoContentTypeField = schema.paths['photo.contentType'];

      // Act & Assert
      expect(photoDataField).toBeDefined();
      expect(photoContentTypeField).toBeDefined();
    });

    it('photo data should be a Buffer', () => {
      // Arrange
      const schema = productModel.schema;
      const photoDataField = schema.paths['photo.data'];

      // Act & Assert
      expect(photoDataField.instance).toBe('Buffer');
    });

    it('photo contentType should be a string', () => {
      // Arrange
      const schema = productModel.schema;
      const contentTypeField = schema.paths['photo.contentType'];

      // Act & Assert
      expect(contentTypeField.instance).toBe('String');
    });

    it('shipping field should be boolean and optional', () => {
      // Arrange
      const schema = productModel.schema;
      const shippingField = schema.paths.shipping;

      // Act & Assert
      expect(shippingField.instance).toBe('Boolean');
      expect(shippingField.isRequired).toBeFalsy();
    });
  });

  describe('Model Functionality', () => {
    it('should create a valid product document structure', () => {
      // Arrange
      const validProduct = {
        name: 'Test Product',
        slug: 'test-product',
        description: 'A test product description',
        price: 99.99,
        category: new mongoose.Types.ObjectId(),
        quantity: 10,
        photo: {
          data: Buffer.from('photo data'),
          contentType: 'image/jpeg'
        },
        shipping: true
      };

      // Act
      const productDoc = new productModel(validProduct);

      // Assert
      expect(productDoc.name).toBe('Test Product');
      expect(productDoc.slug).toBe('test-product');
      expect(productDoc.description).toBe('A test product description');
      expect(productDoc.price).toBe(99.99);
      expect(productDoc.quantity).toBe(10);
      expect(productDoc.photo.contentType).toBe('image/jpeg');
      expect(productDoc.shipping).toBe(true);
    });

    it('should accept optional photo field', () => {
      // Arrange
      const productWithoutPhoto = {
        name: 'Test Product',
        slug: 'test-product',
        description: 'A test product',
        price: 99.99,
        category: new mongoose.Types.ObjectId(),
        quantity: 10
      };

      // Act
      const productDoc = new productModel(productWithoutPhoto);

      // Assert
      expect(productDoc.name).toBe('Test Product');
      expect(productDoc.photo).toEqual({});
    });

    it('should accept optional shipping field', () => {
      // Arrange
      const productWithoutShipping = {
        name: 'Test Product',
        slug: 'test-product',
        description: 'A test product',
        price: 99.99,
        category: new mongoose.Types.ObjectId(),
        quantity: 10
      };

      // Act
      const productDoc = new productModel(productWithoutShipping);

      expect(productDoc.shipping).toBeFalsy();
    });

    it('should handle different price formats', () => {
      // Arrange
      const priceFormats = [99.99, 100, 0.99, 9999.99];

      // Act & Assert
      priceFormats.forEach((price) => {
        const product = new productModel({
          name: 'Test',
          slug: 'test',
          description: 'Test',
          price: price,
          category: new mongoose.Types.ObjectId(),
          quantity: 10
        });
        expect(product.price).toBe(price);
      });
    });

    it('should handle different photo content types', () => {
      // Arrange
      const contentTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

      // Act & Assert
      contentTypes.forEach((contentType) => {
        const product = new productModel({
          name: 'Test',
          slug: 'test',
          description: 'Test',
          price: 99.99,
          category: new mongoose.Types.ObjectId(),
          quantity: 10,
          photo: {
            data: Buffer.from('data'),
            contentType: contentType
          }
        });
        expect(product.photo.contentType).toBe(contentType);
      });
    });
  });

  describe('Validation', () => {
    it('should allow valid product without validation errors', () => {
      // Arrange
      const validProduct = {
        name: 'Valid Product',
        slug: 'valid-product',
        description: 'A valid product',
        price: 99.99,
        category: new mongoose.Types.ObjectId(),
        quantity: 10
      };

      // Act
      const productDoc = new productModel(validProduct);
      const error = productDoc.validateSync();

      // Assert
      expect(error).toBeUndefined();
    });

    it('should fail validation without required name field', () => {
      // Arrange
      const invalidProduct = {
        slug: 'no-name',
        description: 'No name product',
        price: 99.99,
        category: new mongoose.Types.ObjectId(),
        quantity: 10
      };

      // Act
      const productDoc = new productModel(invalidProduct);
      const error = productDoc.validateSync();

      // Assert
      expect(error).toBeDefined();
      expect(error.errors.name).toBeDefined();
    });

    it('should fail validation without required slug field', () => {
      // Arrange
      const invalidProduct = {
        name: 'No slug',
        description: 'No slug product',
        price: 99.99,
        category: new mongoose.Types.ObjectId(),
        quantity: 10
      };

      // Act
      const productDoc = new productModel(invalidProduct);
      const error = productDoc.validateSync();

      // Assert
      expect(error).toBeDefined();
      expect(error.errors.slug).toBeDefined();
    });

    it('should fail validation without required price field', () => {
      // Arrange
      const invalidProduct = {
        name: 'No Price',
        slug: 'no-price',
        description: 'No price product',
        category: new mongoose.Types.ObjectId(),
        quantity: 10
      };

      // Act
      const productDoc = new productModel(invalidProduct);
      const error = productDoc.validateSync();

      // Assert
      expect(error).toBeDefined();
      expect(error.errors.price).toBeDefined();
    });

    it('should fail validation without required category field', () => {
      // Arrange
      const invalidProduct = {
        name: 'No Category',
        slug: 'no-category',
        description: 'No category product',
        price: 99.99,
        quantity: 10
      };

      // Act
      const productDoc = new productModel(invalidProduct);
      const error = productDoc.validateSync();

      // Assert
      expect(error).toBeDefined();
      expect(error.errors.category).toBeDefined();
    });

    it('should fail validation without required quantity field', () => {
      // Arrange
      const invalidProduct = {
        name: 'No Qty',
        slug: 'no-qty',
        description: 'No quantity product',
        price: 99.99,
        category: new mongoose.Types.ObjectId()
      };

      // Act
      const productDoc = new productModel(invalidProduct);
      const error = productDoc.validateSync();

      // Assert
      expect(error).toBeDefined();
      expect(error.errors.quantity).toBeDefined();
    });
  });

  describe('Model Reference', () => {
    it('should be registered as "Products" model', () => {
      // Act
      const modelName = productModel.modelName;

      // Assert
      expect(modelName).toBe('Products');
    });

    it('should reference Category model for category field', () => {
      // Arrange
      const schema = productModel.schema;
      const categoryField = schema.paths.category;

      // Act & Assert
      expect(categoryField.options.ref).toBe('Category');
    });
  });
});
