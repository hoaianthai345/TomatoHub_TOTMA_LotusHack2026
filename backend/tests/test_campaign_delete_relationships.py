import unittest

from app.models.campaign import Campaign


class CampaignDeleteRelationshipConfigTestCase(unittest.TestCase):
    def test_campaign_relationships_use_delete_safe_configuration(self) -> None:
        donations_rel = Campaign.__mapper__.relationships["donations"]
        self.assertTrue(donations_rel.passive_deletes)
        self.assertIn("delete", donations_rel.cascade)
        self.assertIn("delete-orphan", donations_rel.cascade)

        registrations_rel = Campaign.__mapper__.relationships["volunteer_registrations"]
        self.assertTrue(registrations_rel.passive_deletes)
        self.assertIn("delete", registrations_rel.cascade)
        self.assertIn("delete-orphan", registrations_rel.cascade)

        images_rel = Campaign.__mapper__.relationships["images"]
        self.assertTrue(images_rel.passive_deletes)
        self.assertIn("delete", images_rel.cascade)
        self.assertIn("delete-orphan", images_rel.cascade)


if __name__ == "__main__":
    unittest.main()
