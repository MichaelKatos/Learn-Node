const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const slug = require('slugs');

const storeSchema = new mongoose.Schema({
  name: {
    type: String,
    trime: true,
    required: 'Please enter a store name!'
  },
  slug: {
    type: String
  },
  description: {
    type: String,
    trim: true
  },
  tags: [String],
  created: {
    type: Date,
    default: Date.now
  },
  location: {
    type: {
      type: String,
      default: 'Point'
    },
    coordinates: [{
      type: Number,
      required: 'You must supply coordinates'
    }],
    address: {
      type: String,
      required: 'You must supply an address!'
    }
  },
  photo: String,
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: 'You must supply an author'
  }
}, {
  toJSON: {
    virtuals: true
  },
  toObject: {
    virtuals: true
  }
});

storeSchema.index({
  name: 'text',
  description: 'text'
});

storeSchema.index({
  location: '2dsphere'
});

storeSchema.pre('save', async function (next) {
  if (!this.isModified('name')) {
    next(); //skip it!
    return; //Stop this function from running
  }
  this.slug = slug(this.name);

  const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)$`, 'i');
  const storesWithSlug = await this.constructor.find({
    slug: slugRegEx
  });
  if (storesWithSlug.length) {
    this.slug = `${this.slug}-${storesWithSlug.length + 1}`;
  }

  next();
  // TODO make more resiliant so slugs are unique
});

storeSchema.statics.getTagsList = function () {
  return this.aggregate([{
      $unwind: '$tags'
    },
    {
      $group: {
        _id: '$tags',
        count: {
          $sum: 1
        }
      }
    },
    {
      $sort: {
        count: -1
      }
    }
  ]);
};

storeSchema.statics.getTopStores = function () {
  return this.aggregate([
    //Lookup stores and populate their reviews
    {
      $lookup: {
        from: 'reviews',
        localField: '_id',
        foreignField: 'store',
        as: 'reviews'
      }
    },
    //Filter for only items that have 2 or more reviews
    {
      $match: {
        'reviews.1': {
          $exists: true
        }
      }
    },
    //Add the average reviews field
    {
      $project: {
        photo: '$$ROOT.photo',
        name: '$$ROOT.name',
        slug: '$$ROOT.slug',
        reviews: '$$ROOT.reviews',
        averageRating: {
          $avg: '$reviews.rating'
        }
      }
    },
    //Sort it by our new field, highest reviews first
    {
      $sort: {
        averageRating: -1
      }
    },
    //limit to at most 10
    {
      $limit: 5
    }
  ]);
}

// find reviews where the stores_id property === reviews store property
storeSchema.virtual('reviews', {
  ref: 'Review', //what model to link
  localField: '_id', //which field on the store
  foreignField: 'store' //which field on the review
});

function autopopulate(next) {
  this.populate('reviews');
  next();
}

storeSchema.pre('find', autopopulate);
storeSchema.pre('findOne', autopopulate);

module.exports = mongoose.model('Store', storeSchema);